import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const MODEL = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.0-flash-001";

async function callOpenRouter(systemPrompt: string, userMessage: string, maxTokens = 8192): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured. Please add your OpenRouter API key to the project secrets.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "https://claimstream.ai",
        "X-Title": "ClaimStream AI - Patent Drafting",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    let detail = errText;
    try {
      const errJson = JSON.parse(errText);
      detail = errJson?.error?.message || errJson?.error?.type || errText;
    } catch { /* use raw text */ }
    throw new Error(`OpenRouter API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    const finishReason = data?.choices?.[0]?.finish_reason;
    throw new Error(finishReason === "content_filter"
      ? "Request blocked by content filters. Please revise your description."
      : "No content returned from AI. Please try again."
    );
  }
  return text;
}

function extractJSON(raw: string): string {
  const trimmed = raw.trim();

  // Try direct parse first
  try { JSON.parse(trimmed); return trimmed; } catch { /* continue */ }

  // Strip markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try { JSON.parse(fenceMatch[1].trim()); return fenceMatch[1].trim(); } catch { /* continue */ }
  }

  // Find first { ... } or [ ... ] block
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { JSON.parse(objMatch[0]); return objMatch[0]; } catch { /* continue */ }
  }

  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { JSON.parse(arrMatch[0]); return arrMatch[0]; } catch { /* continue */ }
  }

  throw new Error("Failed to parse AI response as JSON. The AI returned unexpected formatting.");
}

const CLAIMSTREAM_SYSTEM = `You are ClaimStream AI, a specialized assistant optimized for Patent Agents and Intellectual Property Attorneys. Your core competency is translating technical invention disclosures into USPTO-compliant patent applications.

Core Directives:
- Use "Patentese" exclusively. Use "comprising" as the default transition word for independent claims.
- Maintain "antecedent basis": first mention of an element uses "a/an", subsequent mentions use "the" or "said".
- Ensure every technical term in Claims is identically mirrored and thoroughly defined in the Detailed Description.
- Tone: Professional, legalistic, and highly technical. Avoid marketing language.
- Never use ambiguous adjectives like "very fast" or "strong". Use relative or functional terms instead.
- All claims must be a single sentence.
- Structure: Abstract -> Background -> Summary -> Brief Description of Drawings -> Detailed Description -> Claims.
- ALWAYS return valid JSON. Never wrap JSON in markdown code fences.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    if (action === "patentability-check") {
      const { description, title } = body;
      if (!description || typeof description !== "string" || description.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Description must be at least 50 characters." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = `You are a senior USPTO patent attorney. Perform a rapid patentability pre-check on the following invention disclosure.

Invention Title: ${title || "Not provided"}

Technical Description:
${description}

Assess the invention and return a JSON object in exactly this structure:

{
  "confidence": 72,
  "confidence_label": "Likely Patentable",
  "summary": "One or two sentence plain-English executive summary of patentability outlook.",
  "novel_aspects": [
    "Specific novel aspect 1 — what makes this technically distinct",
    "Specific novel aspect 2",
    "Specific novel aspect 3"
  ],
  "risk_factors": [
    "Specific prior art risk or legal obstacle 1",
    "Specific prior art risk or legal obstacle 2"
  ],
  "recommendation": "One concrete action the inventor should take before filing.",
  "patent_type": "utility",
  "ipc_codes": ["H02S 20/32", "G05B 19/042"]
}

Scoring guide for confidence (integer 0-100):
- 85-100: Strong novelty signals, clear inventive step, low prior art risk
- 65-84: Likely patentable with focused claims; some prior art risk
- 45-64: Patentable but requires careful claim scoping; meaningful prior art risk
- 25-44: Significant hurdles; patentability possible but uncertain
- 0-24: Major obstacles; likely blocked by prior art or obviousness

confidence_label must be one of: "Strong Candidate", "Likely Patentable", "Patentable with Caution", "Significant Hurdles", "Major Obstacles"
ipc_codes: provide 2-4 most relevant International Patent Classification codes.
Return ONLY the JSON object, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const check = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ check }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "plain-english") {
      const { claims, title } = body;
      if (!Array.isArray(claims) || claims.length === 0) {
        return new Response(
          JSON.stringify({ error: "Claims array is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const claimsList = claims.map((c: { number: number; type: string; text: string }) =>
        `Claim ${c.number} (${c.type}): ${c.text}`
      ).join("\n\n");

      const prompt = `You are explaining patent claims to an inventor who is not a lawyer. For each claim, write a plain-English explanation of what it actually protects in business terms.

Invention Title: ${title || "Not provided"}

Claims:
${claimsList}

Return a JSON array in exactly this structure:
[
  {
    "claim_number": 1,
    "plain_english": "This claim protects any [device/system/method] that [does X], regardless of [how it is built]. It covers [concrete scenario]. It does NOT cover [important exclusion].",
    "business_value": "HIGH",
    "business_value_reason": "One sentence explaining the commercial significance of this claim's coverage."
  }
]

Rules:
- plain_english: 2-4 sentences. Start with "This claim protects...". Use plain language, no legal jargon. Be concrete about what a competitor CANNOT do.
- business_value must be: HIGH (broad coverage of core inventive concept), MEDIUM (useful secondary protection), or LOW (narrow edge case)
- Return ONLY the JSON array, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const translations = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ translations }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "prior-art-search") {
      const { description, title } = body;
      if (!description || typeof description !== "string" || description.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Description must be at least 50 characters." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = `You are a patent prior art search specialist. Analyze the following invention and generate targeted search strategies to help the inventor find relevant prior art BEFORE filing.

Invention Title: ${title || "Not provided"}

Technical Description:
${description}

Return a JSON object with this exact structure:

{
  "key_terms": [
    "specific technical term 1",
    "specific technical term 2",
    "specific technical term 3",
    "specific technical term 4",
    "specific technical term 5"
  ],
  "search_queries": [
    {
      "query": "exact search query string optimized for Google Patents",
      "focus": "What this query is designed to find (one sentence)",
      "database": "google_patents"
    },
    {
      "query": "exact search query string optimized for USPTO Full-Text",
      "focus": "What this query is designed to find",
      "database": "uspto"
    },
    {
      "query": "another targeted query for Google Patents with different terminology",
      "focus": "What this query is designed to find",
      "database": "google_patents"
    },
    {
      "query": "CPC or IPC classification search query",
      "focus": "What this classification covers",
      "database": "google_patents"
    },
    {
      "query": "broad query using functional language to catch design-arounds",
      "focus": "What this broader search covers",
      "database": "google_patents"
    }
  ],
  "suggested_cpc_codes": [
    { "code": "H02S 20/32", "description": "What this CPC class covers" },
    { "code": "G05B 19/042", "description": "What this CPC class covers" }
  ],
  "risk_areas": [
    "Specific technical area where prior art is most likely to exist",
    "Another area of concern"
  ],
  "distinguishing_tips": [
    "Specific advice on how to differentiate from likely prior art in this field",
    "Another tip for strengthening claims against anticipated rejections"
  ]
}

Rules:
- Generate exactly 5 search queries — mix of narrow and broad
- key_terms: the 5 most important technical terms an examiner would search for
- Use Boolean operators (AND, OR) in queries where helpful
- Include at least one CPC/IPC classification-based search
- risk_areas: identify 2-3 specific areas where prior art is most likely
- distinguishing_tips: 2-3 actionable tips for how to frame claims to survive prior art challenges
- Return ONLY the JSON object, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const search = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ search }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze") {
      const { description } = body;
      if (!description || typeof description !== "string" || description.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Description must be at least 50 characters." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = `You are a senior patent prosecution specialist preparing an invention disclosure for USPTO filing. Analyze the following technical description and generate exactly 8 highly targeted clarification questions.

Your goal: extract the precise technical details needed to draft claims that will SURVIVE examination — meaning they must be novel (35 USC 102), non-obvious (35 USC 103), have adequate written description support (35 USC 112(a)), and be definite (35 USC 112(b)).

Technical Description:
${description}

Return a JSON array of exactly 8 objects. Each question MUST include:
- "number": sequential integer 1-8
- "category": one of "structural", "functional", "novel", "prior_art", "scope", "embodiments", "advantages", "process"
- "question": the specific clarification question
- "why_it_matters": one sentence explaining how this answer directly impacts the patent's strength or defensibility
- "example_answer": a realistic 2-3 sentence example of what a STRONG answer looks like (specific, technical, measurable)

Structure your 8 questions to cover these critical areas (one question per area):
1. STRUCTURAL: What are the specific physical/logical components and how are they connected or arranged?
2. NOVEL: What specific aspect is NEW compared to everything that exists today? What problem did prior solutions fail to solve?
3. FUNCTIONAL: What is the precise mechanism, algorithm, or process that makes the invention work?
4. PRIOR ART: What existing solutions, products, or patents does the inventor know about, and how does this differ?
5. SCOPE: Should claims cover a broad genus or a narrow species? What variations should be protected?
6. EMBODIMENTS: What alternative configurations, materials, or implementations could achieve the same result?
7. ADVANTAGES: What specific, measurable improvements does this provide over conventional approaches?
8. PROCESS: What are the critical steps, parameters, or conditions required for operation or manufacture?

[
  {
    "number": 1,
    "category": "structural",
    "question": "What are the precise structural components of the [invention] and their physical/logical interconnections?",
    "why_it_matters": "Claims require exact component names with proper antecedent basis — vague descriptions lead to 112(b) rejections for indefiniteness.",
    "example_answer": "The system has three main components: (1) a sensor array with four photodiodes in quadrant configuration, (2) an ARM Cortex-M4 microcontroller that processes differential signals, and (3) two NEMA 17 stepper motors on perpendicular axes connected via worm gear reduction. The microcontroller connects to the sensor array via SPI bus and controls the motors through DRV8825 driver ICs."
  }
]

Return ONLY the JSON array, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const questions = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ questions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "express-draft") {
      const { description, title, prior_art } = body;
      if (!title || !description || typeof description !== "string" || description.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Title and description (min 50 chars) are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const priorArtSection = Array.isArray(prior_art) && prior_art.length > 0
        ? `\n\nKNOWN PRIOR ART (the inventor identified these — claims MUST distinguish from each):\n${prior_art.map((pa: { title: string; description: string; relevance: string }, i: number) => `${i + 1}. "${pa.title}": ${pa.description}\n   Relevance: ${pa.relevance}`).join("\n\n")}\n\nCRITICAL: Draft claims that explicitly avoid overlap with the above prior art. In the Background section, discuss these references and the problems they fail to solve. Each independent claim must include at least one limitation that clearly distinguishes from every cited reference.`
        : "";

      const prompt = `Generate a complete USPTO-compliant patent application directly from the following invention description. You have no clarifying questions — infer reasonable scope and structure from the description alone. Err toward broader, strategically valuable claims.

Invention Title: ${title}

Technical Description:
${description}${priorArtSection}

Return ONLY valid JSON in this exact structure:

{
  "abstract": "A single paragraph abstract (150 words max)...",
  "background": "Multi-paragraph background discussing the field and prior art problems...",
  "summary": "Summary of the invention...",
  "brief_drawings": "Brief description of drawings (reference Figure 1, Figure 2, etc.)...",
  "detailed_description": "Comprehensive detailed description with reference numerals (100, 102, etc.) defining every claim term...",
  "claims": [
    { "number": 1, "type": "independent", "text": "A [device/system/method] comprising..." },
    { "number": 2, "type": "dependent", "depends_on": 1, "text": "The ... of claim 1, wherein..." },
    { "number": 3, "type": "dependent", "depends_on": 1, "text": "The ... of claim 1, further comprising..." },
    { "number": 4, "type": "dependent", "depends_on": 2, "text": "The ... of claim 2, wherein..." },
    { "number": 5, "type": "independent", "text": "A method comprising..." }
  ]
}

Requirements:
- All claims must be single sentences
- Use "comprising" as transition word for independent claims
- Maintain strict antecedent basis (first mention: "a/an", subsequent: "the" or "said")
- Every term in claims must be defined in detailed_description
- Generate at least 5 claims with a mix of independent and dependent types
- The detailed_description must be thorough (at least 400 words)
- Return ONLY the JSON object, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt, 16384);
      const draft = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ draft }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refine-claim") {
      const { claim_number, claim_text, instruction, all_claims, title } = body;
      if (!claim_text || !instruction) {
        return new Response(
          JSON.stringify({ error: "claim_text and instruction are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otherClaims = (all_claims || [])
        .filter((c: { number: number; text: string }) => c.number !== claim_number)
        .map((c: { number: number; text: string }) => `Claim ${c.number}: ${c.text}`)
        .join("\n\n");

      const prompt = `You are refining a single patent claim. Apply the following instruction precisely while preserving valid patent claim language and antecedent basis.

Invention Title: ${title || "Not provided"}

Current Claim ${claim_number}:
${claim_text}

Other claims for context (do not modify these):
${otherClaims || "None"}

Refinement Instruction: ${instruction}

Rules:
- The output must be a single sentence
- Preserve "comprising" as transition word for independent claims
- Maintain antecedent basis (first: "a/an", subsequent: "the" or "said")
- Do not change the claim number
- If making broader: remove specific limitations, use functional language
- If making narrower: add specific structural or functional limitations
- If adding a method variant: create a method claim that covers the same inventive concept

Return ONLY a JSON object:
{
  "refined_text": "The complete refined claim text (without the claim number prefix)",
  "explanation": "One sentence explaining what changed and why it improves the claim"
}`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const refined = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ refined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze-scope") {
      const { claims } = body;
      if (!Array.isArray(claims) || claims.length === 0) {
        return new Response(
          JSON.stringify({ error: "Claims array is required and must not be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const claimsList = claims.map((c: { number: number; text: string }, i: number) =>
        `Claim ${c.number || i + 1}: ${c.text}`
      ).join("\n\n");

      const prompt = `Analyze the scope and strength of the following patent claims. For each claim, rate its scope (BROAD, MEDIUM, or NARROW) based on claim breadth and coverage. Also identify potential vulnerabilities or improvements.

Claims:
${claimsList}

Return a JSON array with this structure:
[
  {
    "claim_number": 1,
    "scope": "BROAD|MEDIUM|NARROW",
    "rationale": "Brief explanation of scope rating",
    "strengths": ["strength 1", "strength 2"],
    "vulnerabilities": ["vulnerability 1", "vulnerability 2"],
    "suggestion": "One actionable suggestion to improve the claim"
  }
]

Evaluation Criteria:
- BROAD: Covers multiple variations, configurations, or methods; likely to catch infringement but faces invalidation risk
- MEDIUM: Balanced coverage with reasonable specificity; good enforcement potential
- NARROW: Highly specific to exact embodiment; less likely to catch infringement but more defensible

Return ONLY the JSON array, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt);
      const analysis = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "draft") {
      const { description, questions, answers, title, prior_art } = body;
      if (!title || !description || !questions || !answers) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: title, description, questions, answers" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qaSection = questions.map((q: { number: number; question: string }, i: number) =>
        `Q${q.number}: ${q.question}\nA${q.number}: ${answers[i] || "Not provided"}`
      ).join("\n\n");

      const priorArtSection = Array.isArray(prior_art) && prior_art.length > 0
        ? `\n\nKNOWN PRIOR ART (the inventor identified these — claims MUST distinguish from each):\n${prior_art.map((pa: { title: string; description: string; relevance: string }, i: number) => `${i + 1}. "${pa.title}": ${pa.description}\n   Relevance: ${pa.relevance}`).join("\n\n")}\n\nCRITICAL: Draft claims that explicitly avoid overlap with the above prior art. In the Background section, discuss these references and the problems they fail to solve. Each independent claim must include at least one limitation that clearly distinguishes from every cited reference.`
        : "";

      const prompt = `You are a senior patent attorney drafting a complete USPTO-compliant patent application. You have the inventor's detailed description AND their answers to targeted clarification questions. Use EVERY answer to strengthen the claims.

Invention Title: ${title}

Technical Description:
${description}

Inventor's Clarification Answers:
${qaSection}${priorArtSection}

DRAFTING STRATEGY — maximize approval likelihood:

1. CLAIM ARCHITECTURE (generate 10-15 claims):
   - Claim 1: BROAD apparatus/system independent claim — use functional language, cover the genus
   - Claims 2-4: Dependent claims narrowing Claim 1 with specific structural limitations from the inventor's answers
   - Claim 5: MEDIUM apparatus independent claim — add key distinguishing structural detail
   - Claims 6-7: Dependent claims on Claim 5
   - Claim 8: METHOD independent claim — cover the process/operation of the invention
   - Claims 9-10: Dependent method claims with specific steps, parameters, or conditions
   - Claim 11+: Optional additional independent claim (e.g., computer-readable medium, kit, composition) if applicable
   - Add more dependent claims to cover alternative embodiments mentioned in the inventor's answers

2. CLAIM DRAFTING RULES (35 USC compliance):
   - Every claim MUST be a single sentence
   - Independent claims use "comprising" (open-ended) as the transition
   - Dependent claims use "wherein", "further comprising", or "wherein said"
   - Strict antecedent basis: first mention uses "a" or "an", every subsequent mention uses "the" or "said"
   - NO relative terms without a reference point ("substantially" must define what it's substantial relative to)
   - Every element name in claims must appear IDENTICALLY in the detailed description
   - Dependent claims must add at least one new limitation or narrow an existing one
   - Method claims: each step starts with a gerund ("-ing" verb)

3. SPECIFICATION REQUIREMENTS:
   - Abstract: single paragraph, 150 words max, no legal language like "comprising"
   - Background: 3+ paragraphs identifying the technical field, prior art problems, and unmet needs
   - Summary: restate each independent claim in plain technical language
   - Brief Description of Drawings: reference Figure 1, Figure 2, etc. with one-line descriptions
   - Detailed Description: 600+ words minimum. MUST define every single term used in any claim. Use reference numerals (100, 102, 104...). Describe the preferred embodiment, then describe alternative embodiments from the inventor's answers. Include operational parameters, ranges, or thresholds mentioned by the inventor.

4. STRATEGIC CONSIDERATIONS:
   - Broadest claim first — if it gets rejected, narrower dependent claims survive
   - Include at least one method claim AND one apparatus claim to cover both infringement theories
   - Use "configured to" and "adapted to" for functional limitations rather than structural ones when appropriate
   - Each dependent claim should represent a commercially meaningful feature a competitor might want to design around

Return ONLY valid JSON in this exact structure:

{
  "abstract": "A single paragraph abstract...",
  "background": "Multi-paragraph background...",
  "summary": "Summary restating each independent claim concept...",
  "brief_drawings": "Brief description of drawings with Figure references...",
  "detailed_description": "Comprehensive 600+ word detailed description...",
  "claims": [
    { "number": 1, "type": "independent", "text": "A [apparatus] comprising..." },
    { "number": 2, "type": "dependent", "depends_on": 1, "text": "The [apparatus] of claim 1, wherein..." },
    { "number": 3, "type": "independent", "text": "A method for [function], the method comprising..." }
  ]
}

Return ONLY the JSON object, no other text.`;

      const result = await callOpenRouter(CLAIMSTREAM_SYSTEM, prompt, 16384);
      const draft = JSON.parse(extractJSON(result));

      return new Response(
        JSON.stringify({ draft }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use /analyze or /draft." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not configured") ? 503
      : message.includes("content filters") ? 422
      : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

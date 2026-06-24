import { supabase } from './supabase';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patent-ai`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || `Request failed (${res.status})`;
  } catch {
    try {
      return await res.text() || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  }
}

// Single point of truth for calling the patent-ai edge function: builds auth
// headers, POSTs the body, and surfaces a friendly error on failure. Callers
// validate the shape of the returned JSON themselves.
async function callFunction(action: string, body: unknown): Promise<Record<string, unknown>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export type AIQuestion = {
  number: number;
  category: string;
  question: string;
  why_it_matters?: string;
  example_answer?: string;
};

export type AIDraft = {
  abstract: string;
  background: string;
  summary: string;
  brief_drawings: string;
  detailed_description: string;
  claims: Array<{
    number: number;
    type: 'independent' | 'dependent';
    depends_on?: number;
    text: string;
  }>;
};

export type PatentabilityCheck = {
  confidence: number;
  confidence_label: 'Strong Candidate' | 'Likely Patentable' | 'Patentable with Caution' | 'Significant Hurdles' | 'Major Obstacles';
  summary: string;
  novel_aspects: string[];
  risk_factors: string[];
  recommendation: string;
  patent_type: string;
  ipc_codes: string[];
};

export type PriorArtReference = {
  title: string;
  url: string;
  description: string;
  relevance: string;
};

export type PriorArtSearchResult = {
  key_terms: string[];
  search_queries: Array<{
    query: string;
    focus: string;
    database: 'google_patents' | 'uspto';
  }>;
  suggested_cpc_codes: Array<{
    code: string;
    description: string;
  }>;
  risk_areas: string[];
  distinguishing_tips: string[];
};

export type ClaimPlainEnglish = {
  claim_number: number;
  plain_english: string;
  business_value: 'HIGH' | 'MEDIUM' | 'LOW';
  business_value_reason: string;
};

export type ClaimScopeAnalysis = {
  claim_number: number;
  scope: 'BROAD' | 'MEDIUM' | 'NARROW';
  rationale: string;
  strengths: string[];
  vulnerabilities: string[];
  suggestion: string;
};

function validateQuestions(data: unknown): AIQuestion[] {
  if (!Array.isArray(data)) throw new Error('Invalid response: expected an array of questions');
  return data.map((q: Record<string, unknown>, i: number) => ({
    number: typeof q.number === 'number' ? q.number : i + 1,
    category: typeof q.category === 'string' ? q.category : 'general',
    question: typeof q.question === 'string' ? q.question : String(q.question ?? ''),
    why_it_matters: typeof q.why_it_matters === 'string' ? q.why_it_matters : undefined,
    example_answer: typeof q.example_answer === 'string' ? q.example_answer : undefined,
  }));
}

function validateDraft(data: Record<string, unknown>): AIDraft {
  const required = ['abstract', 'background', 'summary', 'brief_drawings', 'detailed_description'];
  for (const key of required) {
    if (typeof data[key] !== 'string' || !(data[key] as string).trim()) {
      throw new Error(`Invalid draft: missing or empty "${key}" section`);
    }
  }
  if (!Array.isArray(data.claims) || data.claims.length === 0) {
    throw new Error('Invalid draft: no claims generated');
  }
  return {
    abstract: data.abstract as string,
    background: data.background as string,
    summary: data.summary as string,
    brief_drawings: data.brief_drawings as string,
    detailed_description: data.detailed_description as string,
    claims: (data.claims as Array<Record<string, unknown>>).map(c => ({
      number: typeof c.number === 'number' ? c.number : 1,
      type: c.type === 'dependent' ? 'dependent' as const : 'independent' as const,
      depends_on: typeof c.depends_on === 'number' ? c.depends_on : undefined,
      text: typeof c.text === 'string' ? c.text : String(c.text ?? ''),
    })),
  };
}

export async function patentabilityCheck(title: string, description: string): Promise<PatentabilityCheck> {
  const data = await callFunction('patentability-check', { title, description });
  const check = data.check as PatentabilityCheck | undefined;
  if (typeof check?.confidence !== 'number') throw new Error('Invalid patentability check response');
  return check;
}

export async function translateClaimsToPlainEnglish(
  claims: Array<{ number: number; type: string; text: string }>,
  title: string
): Promise<ClaimPlainEnglish[]> {
  const data = await callFunction('plain-english', { claims, title });
  if (!Array.isArray(data.translations)) throw new Error('Invalid plain-English response');
  return data.translations;
}

export async function priorArtSearch(title: string, description: string): Promise<PriorArtSearchResult> {
  const data = await callFunction('prior-art-search', { title, description });
  const search = data.search as PriorArtSearchResult | undefined;
  if (!search?.search_queries) throw new Error('Invalid prior art search response');
  return search;
}

export async function analyzeDescription(description: string): Promise<AIQuestion[]> {
  const data = await callFunction('analyze', { description });
  return validateQuestions(data.questions);
}

export async function generateDraft(
  description: string,
  questions: AIQuestion[],
  answers: string[],
  title: string,
  priorArt?: PriorArtReference[]
): Promise<AIDraft> {
  const data = await callFunction('draft', { description, questions, answers, title, prior_art: priorArt });
  return validateDraft(data.draft as Record<string, unknown>);
}

export async function expressDraft(title: string, description: string, priorArt?: PriorArtReference[]): Promise<AIDraft> {
  const data = await callFunction('express-draft', { title, description, prior_art: priorArt });
  return validateDraft(data.draft as Record<string, unknown>);
}

export async function refineClaim(
  claimNumber: number,
  claimText: string,
  instruction: string,
  allClaims: Array<{ number: number; text: string }>,
  title: string
): Promise<{ refined_text: string; explanation: string }> {
  const data = await callFunction('refine-claim', {
    claim_number: claimNumber,
    claim_text: claimText,
    instruction,
    all_claims: allClaims,
    title,
  });
  const refined = data.refined as { refined_text: string; explanation: string } | undefined;
  if (!refined?.refined_text) throw new Error('Invalid refinement response');
  return refined;
}

export async function analyzeClaimScope(claims: Array<{ number: number; text: string }>): Promise<ClaimScopeAnalysis[]> {
  const data = await callFunction('analyze-scope', { claims });
  if (!Array.isArray(data.analysis)) {
    throw new Error('Invalid response: expected an array of analyses');
  }
  return data.analysis;
}

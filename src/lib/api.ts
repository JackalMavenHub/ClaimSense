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
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/patentability-check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = await res.json();
  if (typeof data.check?.confidence !== 'number') throw new Error('Invalid patentability check response');
  return data.check;
}

export async function translateClaimsToPlainEnglish(
  claims: Array<{ number: number; type: string; text: string }>,
  title: string
): Promise<ClaimPlainEnglish[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/plain-english`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ claims, title }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = await res.json();
  if (!Array.isArray(data.translations)) throw new Error('Invalid plain-English response');
  return data.translations;
}

export async function priorArtSearch(title: string, description: string): Promise<PriorArtSearchResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/prior-art-search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = await res.json();
  if (!data.search?.search_queries) throw new Error('Invalid prior art search response');
  return data.search;
}

export async function analyzeDescription(description: string): Promise<AIQuestion[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const data = await res.json();
  return validateQuestions(data.questions);
}

export async function generateDraft(
  description: string,
  questions: AIQuestion[],
  answers: string[],
  title: string,
  priorArt?: PriorArtReference[]
): Promise<AIDraft> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ description, questions, answers, title, prior_art: priorArt }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const data = await res.json();
  return validateDraft(data.draft);
}

export async function expressDraft(title: string, description: string, priorArt?: PriorArtReference[]): Promise<AIDraft> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/express-draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description, prior_art: priorArt }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = await res.json();
  return validateDraft(data.draft);
}

export async function refineClaim(
  claimNumber: number,
  claimText: string,
  instruction: string,
  allClaims: Array<{ number: number; text: string }>,
  title: string
): Promise<{ refined_text: string; explanation: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/refine-claim`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      claim_number: claimNumber,
      claim_text: claimText,
      instruction,
      all_claims: allClaims,
      title,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = await res.json();
  if (!data.refined?.refined_text) throw new Error('Invalid refinement response');
  return data.refined;
}

export async function analyzeClaimScope(claims: Array<{ number: number; text: string }>): Promise<ClaimScopeAnalysis[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/analyze-scope`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ claims }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const data = await res.json();
  if (!Array.isArray(data.analysis)) {
    throw new Error('Invalid response: expected an array of analyses');
  }
  return data.analysis;
}

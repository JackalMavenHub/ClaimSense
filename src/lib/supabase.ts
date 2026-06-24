import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SESSION_STATUS = {
  QUESTIONING: 'questioning',
  DRAFTING: 'drafting',
  COMPLETE: 'complete',
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

export type PatentSession = {
  id: string;
  user_id: string;
  title: string;
  technical_description: string;
  invention_type: string;
  status: SessionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type InventorDeclaration = {
  id: string;
  session_id: string;
  inventor_order: number;
  full_legal_name: string;
  mailing_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  citizenship: string;
  created_at: string;
  updated_at: string;
};

export type SessionQuestion = {
  id: string;
  session_id: string;
  question_number: number;
  question_text: string;
  answer_text: string;
  category: string;
  created_at: string;
};

export type PatentDraft = {
  id: string;
  session_id: string;
  abstract_text: string;
  background_text: string;
  summary_text: string;
  brief_drawings_text: string;
  detailed_description_text: string;
  claims_text: string;
  independent_claims: Claim[];
  dependent_claims: Claim[];
  version: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

export type Claim = {
  number: number;
  type: 'independent' | 'dependent';
  depends_on?: number;
  text: string;
};

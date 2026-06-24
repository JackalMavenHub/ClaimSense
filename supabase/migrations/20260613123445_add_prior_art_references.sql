-- Add prior art references as JSONB on patent_sessions
-- Stores array of { title, url, description, relevance } objects
ALTER TABLE patent_sessions
  ADD COLUMN IF NOT EXISTS prior_art_references jsonb DEFAULT '[]'::jsonb;

-- Add guidance fields to session_questions for improved guided mode
ALTER TABLE session_questions
  ADD COLUMN IF NOT EXISTS why_it_matters text DEFAULT '',
  ADD COLUMN IF NOT EXISTS example_answer text DEFAULT '';

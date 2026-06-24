/*
  # Add Inventor Declarations and Session Notes

  ## Tables Added

  ### inventor_declarations
  Stores legal inventor information required for USPTO filing:
  - Full legal name
  - Mailing address
  - City, State/Province, Country
  - Citizenship
  
  Supports multiple inventors per session (joint invention scenario).

  ### patent_sessions updated
  Adds `notes` column for freeform inventor notes / changelog.

  ## Security
  RLS enabled, authenticated users can only access their own sessions' data.
*/

-- Add notes column to patent_sessions
ALTER TABLE patent_sessions 
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Create inventor_declarations table
CREATE TABLE IF NOT EXISTS inventor_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES patent_sessions(id) ON DELETE CASCADE NOT NULL,
  inventor_order integer NOT NULL DEFAULT 1,
  full_legal_name text NOT NULL DEFAULT '',
  mailing_address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state_province text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  citizenship text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventor_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session inventors"
  ON inventor_declarations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = inventor_declarations.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session inventors"
  ON inventor_declarations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = inventor_declarations.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session inventors"
  ON inventor_declarations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = inventor_declarations.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = inventor_declarations.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session inventors"
  ON inventor_declarations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = inventor_declarations.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventor_declarations_session_id ON inventor_declarations(session_id);
CREATE INDEX IF NOT EXISTS idx_patent_sessions_notes ON patent_sessions(user_id);

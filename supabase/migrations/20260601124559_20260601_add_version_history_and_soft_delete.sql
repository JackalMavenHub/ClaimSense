/*
  # Add Version History and Soft-Delete

  ## Overview
  Adds version history for patent drafts and soft-delete for sessions.
  - Track draft versions to preserve previous iterations
  - Enable session recovery with soft-delete (deleted_at column)
  - Add timestamp for version tracking

  ## Tables Modified
  
  ### patent_sessions
  - Add `deleted_at` column for soft-delete (NULL = active)
  
  ### patent_drafts
  - Add `version` column (auto-incrementing per session)
  - Add `is_current` boolean flag to mark active draft
  - Allows keeping history of all draft iterations

  ## Migration Details
  1. Add deleted_at to patent_sessions
  2. Add version tracking to patent_drafts
  3. Update RLS policies to exclude soft-deleted sessions
  4. Add index for efficient filtering
*/

-- Add soft-delete to patent_sessions
ALTER TABLE patent_sessions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add version history to patent_drafts
ALTER TABLE patent_drafts 
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true;

-- Create unique index for current draft per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_patent_drafts_current_per_session 
  ON patent_drafts(session_id) WHERE is_current = true;

-- Create index for version history lookup
CREATE INDEX IF NOT EXISTS idx_patent_drafts_version 
  ON patent_drafts(session_id, version DESC);

-- Update RLS policies to exclude soft-deleted sessions

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own sessions" ON patent_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON patent_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON patent_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON patent_sessions;

-- Create new policies that exclude soft-deleted sessions
CREATE POLICY "Users can view own active sessions"
  ON patent_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own sessions"
  ON patent_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active sessions"
  ON patent_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own sessions"
  ON patent_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update index
CREATE INDEX IF NOT EXISTS idx_patent_sessions_deleted_at 
  ON patent_sessions(user_id, deleted_at);

/*
  # Fix delete RLS policies and add missing session_questions DELETE policy

  ## Problems Fixed

  1. patent_sessions DELETE: Migration 2 dropped the original DELETE policy and replaced
     session deletes with soft-delete UPDATE policies. However, the frontend currently calls
     hard DELETE (`.delete()`). This migration adds back a proper hard DELETE policy so
     deletes actually succeed, and keeps the soft-delete UPDATE policy for compatibility.

  2. session_questions DELETE: No DELETE policy ever existed, so when a session is deleted
     the cascade handles it at DB level, but explicit question cleanup from the app was
     silently failing. Adding a policy for completeness.

  3. patent_drafts: Adds a DELETE policy so orphaned draft rows can be explicitly removed
     if needed (e.g., when re-drafting cleans up old versions).

  4. Ensures the "is_current" index doesn't conflict when multiple drafts per session exist
     (version history) — the partial unique index only allows one is_current=true per session,
     which is correct and intentional.

  ## Security
  All policies enforce auth.uid() = owner check. No public access.
*/

-- 1. Restore hard DELETE on patent_sessions so .delete() calls actually work.
--    The soft-delete UPDATE policies from migration 2 are kept alongside this.
DROP POLICY IF EXISTS "Users can hard-delete own sessions" ON patent_sessions;

CREATE POLICY "Users can hard-delete own sessions"
  ON patent_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Add DELETE policy for session_questions
DROP POLICY IF EXISTS "Users can delete own session questions" ON session_questions;

CREATE POLICY "Users can delete own session questions"
  ON session_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = session_questions.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

-- 3. Add DELETE policy for patent_drafts
DROP POLICY IF EXISTS "Users can delete own patent drafts" ON patent_drafts;

CREATE POLICY "Users can delete own patent drafts"
  ON patent_drafts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patent_sessions
      WHERE patent_sessions.id = patent_drafts.session_id
        AND patent_sessions.user_id = auth.uid()
    )
  );

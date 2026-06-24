/*
  # Fix Soft-Delete: Proper RLS Policies for Trash/Restore Flow

  ## Problem
  - SELECT policy filters `deleted_at IS NULL`, preventing users from seeing trashed items
  - Hard DELETE policy exists but conflicts with soft-delete intent
  - No way for users to view or restore trashed sessions

  ## Solution
  1. Replace SELECT policy: allow viewing ALL owned sessions (app filters active vs trash)
  2. Remove hard DELETE policy on patent_sessions (soft-delete only)
  3. Keep UPDATE policy so users can set/unset deleted_at
  4. Keep hard DELETE on child tables (cascade still works for permanent delete via function)
*/

-- 1. Replace SELECT to allow viewing both active AND trashed sessions
DROP POLICY IF EXISTS "Users can view own active sessions" ON patent_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON patent_sessions;

CREATE POLICY "Users can view own sessions"
  ON patent_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix UPDATE policies: merge soft-delete and normal update into one clean policy
DROP POLICY IF EXISTS "Users can update own active sessions" ON patent_sessions;
DROP POLICY IF EXISTS "Users can soft-delete own sessions" ON patent_sessions;

CREATE POLICY "Users can update own sessions"
  ON patent_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Keep hard DELETE for permanent purge from trash
-- (policy from migration 3 already exists, just ensure it's there)
DROP POLICY IF EXISTS "Users can hard-delete own sessions" ON patent_sessions;

CREATE POLICY "Users can hard-delete own sessions"
  ON patent_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

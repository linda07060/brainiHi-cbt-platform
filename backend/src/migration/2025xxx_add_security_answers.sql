-- Migration: create security answer tables (if missing) and optional summary column on user
-- Safe to re-run (idempotent). Intended to be stored in migrations/.

BEGIN;

-- 1) Create user_security_answer (common name; uses camelCase userId like your DB)
CREATE TABLE IF NOT EXISTS user_security_answer (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  questionKey VARCHAR NOT NULL,
  answerHash VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure an index on userId for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_security_answer_userid ON user_security_answer ("userId");

-- 2) Create alternate table name that some installs use (harmless no-op if already present)
CREATE TABLE IF NOT EXISTS user_security_answers (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  questionKey VARCHAR NOT NULL,
  answerHash VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_security_answers_userid ON user_security_answers ("userId");

-- 3) (Optional) Add a summary/hash column to "user" as a fallback storage of hashed answers
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS security_answers_hash VARCHAR;

COMMIT;
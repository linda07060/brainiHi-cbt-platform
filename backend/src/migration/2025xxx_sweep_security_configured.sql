-- Sweep: mark security_configured = TRUE for users that have answer rows or a summary hash.
-- Idempotent: safe to run multiple times. Intended to be stored in migrations/.

BEGIN;

-- 1) Mark users who have rows in user_security_answer
UPDATE "user" u
SET security_configured = TRUE
WHERE u.id IN (
  SELECT DISTINCT "userId" FROM user_security_answer
)
AND COALESCE(u.security_configured, FALSE) = FALSE;

-- 2) Mark camelCase variant as well (if present)
UPDATE "user" u
SET "securityConfigured" = TRUE
WHERE u.id IN (
  SELECT DISTINCT "userId" FROM user_security_answer
)
AND (COALESCE(u."securityConfigured", FALSE) = FALSE);

-- 3) Also sweep the alternate table name if present
UPDATE "user" u
SET security_configured = TRUE
WHERE u.id IN (
  SELECT DISTINCT "userId" FROM user_security_answers
)
AND COALESCE(u.security_configured, FALSE) = FALSE;

UPDATE "user" u
SET "securityConfigured" = TRUE
WHERE u.id IN (
  SELECT DISTINCT "userId" FROM user_security_answers
)
AND (COALESCE(u."securityConfigured", FALSE) = FALSE);

-- 4) Finally, mark users who already have a non-null summary hash on user
UPDATE "user" u
SET security_configured = TRUE
WHERE COALESCE(u.security_answers_hash, '') <> ''
AND COALESCE(u.security_configured, FALSE) = FALSE;

UPDATE "user" u
SET "securityConfigured" = TRUE
WHERE COALESCE(u.security_answers_hash, '') <> ''
AND (COALESCE(u."securityConfigured", FALSE) = FALSE);

COMMIT;
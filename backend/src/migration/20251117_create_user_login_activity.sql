CREATE TABLE IF NOT EXISTS user_login_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  email VARCHAR(320) NULL,
  ip INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_login_activity_email_idx ON user_login_activity (email);
CREATE INDEX IF NOT EXISTS user_login_activity_created_at_idx ON user_login_activity (created_at DESC);
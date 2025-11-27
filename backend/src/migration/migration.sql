ALTER TABLE "user" ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(); 
UPDATE "user" SET created_at = NOW() WHERE created_at IS NULL; 
ALTER TABLE "user" ALTER COLUMN created_at SET NOT NULL;
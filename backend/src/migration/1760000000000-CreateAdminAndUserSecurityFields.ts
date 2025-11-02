/* url: (local file) */
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdminAndUserSecurityFields1760000000000 implements MigrationInterface {
  name = 'CreateAdminAndUserSecurityFields1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin table (if not exists)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin" (
        "id" SERIAL PRIMARY KEY,
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "role" character varying(32) NOT NULL DEFAULT 'admin',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // Ensure unique index on admin email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_email" ON "admin" ("email");
    `);

    // Add missing columns to "user" table if they don't exist:
    // user_uid (nullable unique), phone, recoveryPassphraseHash, active
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "user_uid" character varying(64);
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "phone" character varying(64);
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "recoveryPassphraseHash" character varying(128);
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true;
    `);

    // Add unique index for user_uid
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_user_uid" ON "user" ("user_uid");
    `);

    // Create user_security_answer table if it doesn't exist (safe-guard)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_security_answer" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "questionKey" character varying(80) NOT NULL,
        "answerHash" character varying(128) NOT NULL
      );
    `);

    // Index for user_security_answer
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_security_answer_userId" ON "user_security_answer" ("userId");
    `);

    // Add FK only if it doesn't already exist (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_security_answer_user') THEN
          ALTER TABLE "user_security_answer"
          ADD CONSTRAINT "FK_user_security_answer_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
        END IF;
      END;
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK and table user_security_answer if exists
    await queryRunner.query(`
      ALTER TABLE "user_security_answer" DROP CONSTRAINT IF EXISTS "FK_user_security_answer_user";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_security_answer_userId";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_security_answer";
    `);

    // Drop unique index on user.user_uid but keep column removal guarded
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_user_uid";
    `);

    // Remove added user columns (guarded)
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "recoveryPassphraseHash";
    `);
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "phone";
    `);
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "user_uid";
    `);
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "active";
    `);

    // Drop admin table and its index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_admin_email";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "admin";
    `);
  }
}
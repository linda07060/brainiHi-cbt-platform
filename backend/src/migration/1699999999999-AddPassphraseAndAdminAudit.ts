import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequireSecurityAndAdminAudit1699999999999 implements MigrationInterface {
  name = "AddRequireSecurityAndAdminAudit1699999999999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add passphrase only if neither passphrase nor recoveryPassphraseHash exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND (column_name = 'passphrase' OR column_name = 'recoveryPassphraseHash')
        ) THEN
          ALTER TABLE "user" ADD COLUMN passphrase text;
        END IF;
      END
      $$;
    `);

    // Add require_security_setup if missing
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS require_security_setup boolean NOT NULL DEFAULT false;
    `);

    // Create admin_audit table if not exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_audit (
        id serial PRIMARY KEY,
        admin_id integer,
        target_user_id integer,
        action text NOT NULL,
        ip text,
        meta jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS admin_audit_admin_id_idx ON admin_audit (admin_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS admin_audit_target_user_id_idx ON admin_audit (target_user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes & table
    await queryRunner.query(`DROP INDEX IF EXISTS admin_audit_target_user_id_idx;`);
    await queryRunner.query(`DROP INDEX IF EXISTS admin_audit_admin_id_idx;`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_audit;`);

    // Remove require_security_setup if exists
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS require_security_setup;
    `);

    // Drop passphrase column if it was created by this migration (only when passphrase exists and recoveryPassphraseHash does not)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'passphrase'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user' AND column_name = 'recoveryPassphraseHash'
          )
        ) THEN
          ALTER TABLE "user" DROP COLUMN IF EXISTS passphrase;
        END IF;
      END
      $$;
    `);
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TypeORM migration (TypeScript) to add a created_at timestamptz column to the users table,
 * backfill existing rows, and make the column NOT NULL with a default of now().
 *
 * - Designed for TypeORM v0.3.x migrations folder (ts files compiled/run by your migration tool).
 * - Place this file in your migrations directory (commonly src/migrations or migration).
 * - Filename has a timestamp-like prefix to keep migrations ordered; adjust to your naming convention.
 *
 * Example filename to use in your repo:
 *   src/migrations/169XXX_add_created_at_to_users.ts
 *
 * Run:
 *   - If you use the TypeORM CLI: npx typeorm migration:run
 *   - Or use whatever npm script you have that runs migrations in your project.
 *
 * If your setup runs JS migrations (compiled), compile this file to JS before running migrations,
 * or instead use the SQL migration file provided below.
 */
export class AddCreatedAtToUsers1690000000000 implements MigrationInterface {
  name = 'AddCreatedAtToUsers1690000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add the column with DEFAULT now() so new inserts get a timestamp.
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now();
    `);

    // 2) Backfill any existing NULL values to NOW() (defensive; the ADD COLUMN with DEFAULT
    // already populates existing rows in modern Postgres, but doing an explicit UPDATE is safe).
    await queryRunner.query(`
      UPDATE "users"
      SET "created_at" = now()
      WHERE "created_at" IS NULL;
    `);

    // 3) Make the column NOT NULL so application can rely on it existing.
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "created_at" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column to roll back
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "created_at";
    `);
  }
}
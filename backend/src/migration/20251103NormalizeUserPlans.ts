import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One-time migration to normalize existing user.plan values to canonical values:
 *   - 'Pro'   for values that look like pro
 *   - 'Tutor' for values that look like tutor
 *   - 'Free'  for everything else
 *
 * This is intentionally defensive: it lowercases/trims before classification.
 */
export class NormalizeUserPlans20251103 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use a CASE expression to normalize values in a single query.
    // It trims and lowercases the existing plan value and then maps to canonical values.
    await queryRunner.query(`
      UPDATE "user"
      SET plan = (
        CASE
          WHEN lower(trim(plan)) LIKE '%tutor%' THEN 'Tutor'
          WHEN lower(trim(plan)) LIKE '%pro%' THEN 'Pro'
          WHEN lower(trim(plan)) IN ('pro', 'professional', 'standard', 'paid') THEN 'Pro'
          WHEN lower(trim(plan)) IN ('tutor', 'tutorplan', 'mentor') THEN 'Tutor'
          ELSE 'Free'
        END
      )
      WHERE plan IS NOT NULL;
    `);

    // Optional: normalize whitespace-only or NULL to Free
    await queryRunner.query(`
      UPDATE "user"
      SET plan = 'Free'
      WHERE plan IS NULL OR trim(plan) = '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op down migration: cannot reliably restore original values.
    // If you need an undo, backup the table before running this migration.
  }
}
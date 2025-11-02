import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSecurityTables1699999999997 implements MigrationInterface {
  name = 'CreateUserSecurityTables1699999999997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add optional user_uid column (human-friendly id if you plan to use)
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "user_uid" character varying(64);
    `);

    // Add recoveryPassphraseHash to user (store HMAC hash)
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "recoveryPassphraseHash" character varying(128);
    `);

    // Create user_security_answer table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_security_answer" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "questionKey" character varying(80) NOT NULL,
        "answerHash" character varying(128) NOT NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_security_answer_userId" ON "user_security_answer" ("userId");`);
    await queryRunner.query(`
      ALTER TABLE "user_security_answer"
      ADD CONSTRAINT "FK_user_security_answer_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "recoveryPassphraseHash";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "user_uid";`);
    await queryRunner.query(`ALTER TABLE "user_security_answer" DROP CONSTRAINT IF EXISTS "FK_user_security_answer_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_security_answer_userId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_security_answer";`);
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSecurityFields1700000000000 implements MigrationInterface {
  name = 'AddUserSecurityFields1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add user_uid, phone, recoveryPassphraseHash to user table
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

    // Add unique index to user_uid
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_user_uid" ON "user" ("user_uid");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_security_answer" DROP CONSTRAINT IF EXISTS "FK_user_security_answer_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_security_answer_userId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_security_answer";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_user_uid";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "recoveryPassphraseHash";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "phone";`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "user_uid";`);
  }
}
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAiTablesAndPgvector1699252923000 implements MigrationInterface {
  name = 'CreateAiTablesAndPgvector1699252923000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE: pgvector extension creation removed. Embeddings stored as jsonb.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id bigserial PRIMARY KEY,
        "userId" integer NULL,
        prompt text NOT NULL,
        params jsonb NULL,
        model varchar(128) NULL,
        response jsonb NULL,
        success boolean DEFAULT true,
        error text NULL,
        "createdAt" timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS generated_questions (
        question_id varchar(128) PRIMARY KEY,
        question_text text NOT NULL,
        choices jsonb NOT NULL,
        correct_answer text NOT NULL,
        explanation text NULL,
        difficulty varchar(32) NOT NULL,
        topic varchar(128) NOT NULL,
        estimated_time_seconds int DEFAULT 0,
        metadata jsonb NULL,
        embedding jsonb NULL,
        created_at timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_generated_questions_topic ON generated_questions(topic);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session_performance (
        id bigserial PRIMARY KEY,
        session_id varchar(128) NOT NULL,
        user_id integer NULL,
        question_id varchar(128) NOT NULL,
        difficulty varchar(32) NOT NULL,
        correct boolean NOT NULL,
        time_seconds int NULL,
        created_at timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_session_performance_session ON session_performance(session_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS session_performance;`);
    await queryRunner.query(`DROP TABLE IF EXISTS generated_questions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_logs;`);
  }
}
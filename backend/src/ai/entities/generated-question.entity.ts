import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'generated_questions' })
export class GeneratedQuestion {
  // We keep question_id as the primary key (string) to match the schema
  @PrimaryColumn({ type: 'varchar', length: 128 })
  question_id: string;

  @Column({ type: 'text' })
  question_text: string;

  @Column({ type: 'json' })
  choices: string[];

  @Column({ type: 'text' })
  correct_answer: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  difficulty: string;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  topic: string;

  @Column({ type: 'int', default: 0 })
  estimated_time_seconds: number;

  @Column({ type: 'json', nullable: true })
  metadata?: any | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
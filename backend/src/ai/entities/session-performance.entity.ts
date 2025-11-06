import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'session_performance' })
export class SessionPerformance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  session_id: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  user_id?: number | null;

  @Column({ type: 'varchar', length: 128 })
  question_id: string;

  @Column({ type: 'varchar', length: 32 })
  difficulty: string;

  @Column({ type: 'boolean' })
  correct: boolean;

  @Column({ type: 'int', nullable: true })
  time_seconds?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
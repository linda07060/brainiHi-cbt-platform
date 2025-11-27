import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'ai_logs' })
export class AiLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Index()
  @Column({ type: 'integer', name: 'userId', nullable: true })
  userId?: number | null;

  @Column({ type: 'text', name: 'prompt' })
  prompt: string;

  // Use jsonb to match the DB jsonb type
  @Column({ type: 'jsonb', name: 'params', nullable: true })
  params?: any | null;

  @Column({ type: 'character varying', length: 128, name: 'model', nullable: true })
  model?: string | null;

  @Column({ type: 'jsonb', name: 'response', nullable: true })
  response?: any | null;

  @Column({ type: 'boolean', name: 'success', nullable: true, default: true })
  success?: boolean | null;

  @Column({ type: 'text', name: 'error', nullable: true })
  error?: string | null;

  // Map createdAt explicitly to DB column (timestamptz)
  @Column({ type: 'timestamptz', name: 'createdAt', nullable: true })
  createdAt?: Date | null;
}
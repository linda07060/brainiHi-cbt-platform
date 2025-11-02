import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

/**
 * user_security_answer
 * Stores one hashed security-answer row per user question.
 * answerHash: HMAC-SHA256 hex using SECURITY_SECRET (server-side).
 *
 * Do NOT store plaintext answers.
 */
@Entity({ name: 'user_security_answer' })
export class SecurityAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  userId: number;

  // short key identifying the question (must match frontend QUESTION_MAP keys)
  @Column({ length: 80 })
  questionKey: string;

  // HMAC-SHA256 hex of the answer
  @Column({ length: 128 })
  answerHash: string;
}
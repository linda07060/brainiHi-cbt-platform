import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 'Free' })
  plan: string;

  @Column({ nullable: true })
  plan_expiry: Date;

  @Column({ default: '' })
  googleId: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 'beginner' })
  level: string;

  // Optional human-friendly user identifier (nullable)
  @Column({ nullable: true, unique: true })
  user_uid: string;

  // HMAC-SHA256 hash of the recovery passphrase (stored server-side only)
  @Column({ nullable: true })
  recoveryPassphraseHash: string;

  // Phone number
  @Column({ nullable: true })
  phone: string;

  // Creation timestamp (maps to DB column "created_at")
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
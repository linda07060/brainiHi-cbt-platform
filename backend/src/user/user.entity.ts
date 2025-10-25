import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
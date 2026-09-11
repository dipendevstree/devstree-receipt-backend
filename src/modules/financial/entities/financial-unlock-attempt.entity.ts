import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Per-user record of failed unlock attempts, backing the lockout policy. */
@Entity('financial_unlock_attempts')
@Index('idx_financial_attempts_user_created', ['userId', 'createdAt'])
export class FinancialUnlockAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: false })
  successful!: boolean;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

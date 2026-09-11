import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';

/**
 * A short-lived grant that allows decrypted amounts to leave the API.
 *
 * The unlock token is returned to the client once and stored here only as a
 * SHA-256 hash — the database never holds a usable token, and it never holds the
 * account password or any encryption key.
 */
@Entity('financial_unlock_sessions')
@Index('idx_financial_sessions_user', ['userId'])
@Index('idx_financial_sessions_token_hash', ['sessionTokenHash'], { unique: true })
@Index('idx_financial_sessions_expires', ['expiresAt'])
export class FinancialUnlockSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'session_token_hash', type: 'varchar', length: 128 })
  sessionTokenHash!: string;

  /**
   * Ties the unlock to the login session that created it, so logging out or
   * rotating credentials cannot leave an orphaned financial grant alive.
   */
  @Column({ name: 'auth_token_id', type: 'varchar', length: 64, nullable: true })
  authTokenId!: string | null;

  @Column({ name: 'unlocked_at', type: 'timestamptz' })
  unlockedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  isActive(now = new Date()): boolean {
    return !this.lockedAt && this.expiresAt > now;
  }
}

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
 * Refresh tokens are stored as SHA-256 hashes only — a database leak does not
 * yield usable tokens. Rotation marks the previous row revoked.
 */
@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user', ['userId'])
@Index('idx_refresh_tokens_hash', ['tokenHash'], { unique: true })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /**
   * Absolute end of the login session, fixed at sign-in and inherited unchanged
   * by every rotated token. This is what stops rotation from sliding the
   * session forward indefinitely.
   */
  @Column({ name: 'session_expires_at', type: 'timestamptz' })
  sessionExpiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  isUsable(now = new Date()): boolean {
    return !this.revokedAt && this.expiresAt > now && !this.isSessionExpired(now);
  }

  /** True once the 9-hour (configurable) window from the original login has passed. */
  isSessionExpired(now = new Date()): boolean {
    return this.sessionExpiresAt <= now;
  }
}

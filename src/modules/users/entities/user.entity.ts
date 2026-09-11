import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from 'src/common/entities/base.entity';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { Role } from 'src/modules/roles/entities/role.entity';
import { PasswordHistory } from './password-history.entity';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_phone', ['phone'])
export class User extends SoftDeletableEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 180 })
  email!: string;

  @ApiProperty({ required: false, description: 'Also usable as a login identifier' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  /** Argon2id hash of the login password. Never selected unless explicitly requested. */
  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  /** Argon2id hash of the separate financial account password. */
  @Exclude()
  @Column({
    name: 'account_password_hash',
    type: 'varchar',
    length: 255,
    select: false,
    nullable: true,
  })
  accountPasswordHash!: string | null;

  @ApiProperty()
  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ApiProperty({ enum: UserStatus })
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  /**
   * Bumped whenever credentials change. Access/refresh tokens carry the value
   * they were minted with, so a password change invalidates every issued token.
   */
  @Exclude()
  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion!: number;

  @Exclude()
  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Exclude()
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @OneToMany(() => PasswordHistory, (history) => history.user)
  passwordHistories!: PasswordHistory[];

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.deletedAt;
  }
}

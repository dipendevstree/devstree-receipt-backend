import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { User } from 'src/modules/users/entities/user.entity';

/**
 * Append-only trail. `oldValue`/`newValue` hold redacted snapshots — the audit
 * writer strips every monetary field before persisting, so decrypted amounts
 * never leak into the log.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_user_id', ['userId'])
@Index('idx_audit_logs_created_at', ['createdAt'])
@Index('idx_audit_logs_module_record', ['module', 'recordId'])
@Index('idx_audit_logs_action', ['action'])
export class AuditLog {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ required: false })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @ApiProperty({ required: false, description: 'Denormalised so the trail survives user deletion' })
  @Column({ name: 'user_name', type: 'varchar', length: 120, nullable: true })
  userName!: string | null;

  @ApiProperty({ enum: AuditAction })
  @Column({ type: 'varchar', length: 48 })
  action!: AuditAction;

  @ApiProperty({ enum: AuditModule })
  @Column({ type: 'varchar', length: 32 })
  module!: AuditModule;

  @ApiProperty({ required: false })
  @Column({ name: 'record_id', type: 'varchar', length: 64, nullable: true })
  recordId!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: Record<string, unknown> | null;

  @ApiProperty({ required: false })
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | null;

  @ApiProperty({ required: false })
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

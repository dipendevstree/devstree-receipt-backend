import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import {
  NullableEncryptedAmountColumns,
  SoftDeletableEntity,
} from 'src/common/entities/base.entity';
import { ProjectStatus } from 'src/common/enums/project-status.enum';
import { Client } from 'src/modules/clients/entities/client.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';

/**
 * There is deliberately no `amount` column. The project value exists only as
 * AES-256-GCM ciphertext plus the metadata required to decrypt it.
 *
 * The ciphertext columns are nullable because a project amount is optional:
 * monthly/retainer engagements have no predefined value, they just receive
 * whatever is billed each month. NULL means "not defined" and is a distinct
 * business state from an encrypted zero — see `hasProjectAmount()`.
 */
@Entity('projects')
@Index('idx_projects_client_id', ['clientId'])
@Index('idx_projects_project_code', ['projectCode'], { unique: true })
@Index('idx_projects_status', ['status'])
@Index('idx_projects_name', ['projectName'])
export class Project extends SoftDeletableEntity implements NullableEncryptedAmountColumns {
  @ApiProperty()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.projects, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @ApiProperty({ example: 'PRJ-0001' })
  @Column({ name: 'project_code', type: 'varchar', length: 32 })
  projectCode!: string;

  @ApiProperty()
  @Column({ name: 'project_name', type: 'varchar', length: 180 })
  projectName!: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Encrypted project amount (all NULL when no amount is defined) ──
  @Exclude()
  @Column({ name: 'encrypted_amount', type: 'text', nullable: true })
  encryptedAmount!: string | null;

  @Exclude()
  @Column({ name: 'amount_iv', type: 'varchar', length: 32, nullable: true })
  amountIv!: string | null;

  @Exclude()
  @Column({ name: 'amount_auth_tag', type: 'varchar', length: 32, nullable: true })
  amountAuthTag!: string | null;

  @Exclude()
  @Column({ name: 'encryption_key_version', type: 'int', nullable: true })
  encryptionKeyVersion!: number | null;

  @ApiProperty({ required: false })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @ApiProperty({ enum: ProjectStatus })
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT })
  status!: ProjectStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @OneToMany(() => Payment, (payment) => payment.project)
  payments!: Payment[];

  /**
   * True when a fixed project amount was defined. All four ciphertext columns
   * are written together, so any one of them being NULL means "not defined" —
   * the check is deliberately strict so a half-written row surfaces as missing
   * rather than as a decryption failure.
   */
  hasProjectAmount(): boolean {
    return (
      this.encryptedAmount !== null &&
      this.encryptedAmount !== undefined &&
      this.amountIv !== null &&
      this.amountAuthTag !== null &&
      this.encryptionKeyVersion !== null
    );
  }
}

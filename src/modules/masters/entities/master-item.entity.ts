import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { SoftDeletableEntity } from 'src/common/entities/base.entity';
import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';
import { User } from 'src/modules/users/entities/user.entity';

/**
 * All reference/dropdown data lives in this one table, discriminated by `type`.
 *
 * A single table rather than six near-identical ones keeps CRUD, permissions and
 * the admin UI uniform. Rows whose `code` is referenced by a database enum
 * (statuses, payment methods) are flagged `isSystem`: they can be renamed,
 * reordered and deactivated, but their code cannot change and they cannot be
 * deleted, so existing project/payment rows can never be orphaned.
 */
@Entity('master_items')
@Unique('uq_master_items_type_code', ['type', 'code'])
@Index('idx_master_items_type', ['type'])
@Index('idx_master_items_type_status', ['type', 'status'])
export class MasterItem extends SoftDeletableEntity {
  @ApiProperty({ enum: MasterType })
  @Column({ type: 'varchar', length: 32 })
  type!: MasterType;

  @ApiProperty({ example: 'Bank Transfer' })
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Stable identifier used by other records' })
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MasterStatus })
  @Column({ type: 'varchar', length: 16, default: MasterStatus.ACTIVE })
  status!: MasterStatus;

  @ApiProperty({ example: 10 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** True when the code is referenced by a database enum — protects referential integrity. */
  @ApiProperty()
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  /** Type-specific extras: currency symbol/precision, country dial code, etc. */
  @ApiPropertyOptional({ type: Object })
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User | null;

  @ApiPropertyOptional()
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: User | null;
}

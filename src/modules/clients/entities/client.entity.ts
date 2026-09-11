import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from 'src/common/entities/base.entity';
import { ClientStatus } from 'src/common/enums/client-status.enum';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { User } from 'src/modules/users/entities/user.entity';

/**
 * A client carries exactly five administrator-maintained fields: name, email,
 * phone, country and status. Company name, alternate phone, address, city,
 * state, postal code, tax number and notes were retired by migration
 * 1757700000000; their last values are preserved in `archived_field_values`.
 */
@Entity('clients')
@Index('idx_clients_client_code', ['clientCode'], { unique: true })
@Index('idx_clients_email', ['email'])
@Index('idx_clients_name', ['name'])
@Index('idx_clients_status', ['status'])
export class Client extends SoftDeletableEntity {
  @ApiProperty({ example: 'CLI-0001' })
  @Column({ name: 'client_code', type: 'varchar', length: 32 })
  clientCode!: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 24, nullable: true })
  phone!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 80, nullable: true })
  country!: string | null;

  @ApiProperty({ enum: ClientStatus })
  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status!: ClientStatus;

  @ApiPropertyOptional({ description: 'Administrator who created this record' })
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User | null;

  @ApiPropertyOptional({ description: 'Administrator who last updated this record' })
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: User | null;

  @OneToMany(() => Project, (project) => project.client)
  projects!: Project[];

  @OneToMany(() => Payment, (payment) => payment.client)
  payments!: Payment[];
}

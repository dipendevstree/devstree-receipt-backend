import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Single-row configuration table keyed by a constant so it can never fork. */
@Entity('company_settings')
export class CompanySetting {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  key!: string;

  @ApiProperty()
  @Column({ name: 'company_name', type: 'varchar', length: 160, default: 'Devstree' })
  companyName!: string;

  @ApiProperty({ required: false })
  @Column({ name: 'logo_path', type: 'varchar', length: 255, nullable: true })
  logoPath!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 24, nullable: true })
  phone!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 180, nullable: true })
  website!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 80, nullable: true })
  city!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 80, nullable: true })
  state!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 80, nullable: true })
  country!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'tax_number', type: 'varchar', length: 40, nullable: true })
  taxNumber!: string | null;

  @ApiProperty({ example: 'INR' })
  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency!: string;

  @ApiProperty({ example: '₹' })
  @Column({ name: 'currency_symbol', type: 'varchar', length: 8, default: '₹' })
  currencySymbol!: string;

  @ApiProperty({ example: 2 })
  @Column({ name: 'currency_precision', type: 'int', default: 2 })
  currencyPrecision!: number;

  @ApiProperty({ example: 'dd MMM yyyy' })
  @Column({ name: 'date_format', type: 'varchar', length: 32, default: 'dd MMM yyyy' })
  dateFormat!: string;

  @ApiProperty({ required: false })
  @Column({ name: 'receipt_footer_note', type: 'varchar', length: 255, nullable: true })
  receiptFooterNote!: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'authorized_signatory', type: 'varchar', length: 120, nullable: true })
  authorizedSignatory!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;
}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PaginatedDateFilterQueryDto } from 'src/common/dto/date-filter.dto';
import { PaymentMethod, PaymentStatus } from 'src/common/enums/payment.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** Query strings arrive as '' when a select is reset to "All"; that means "no filter". */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

@ValidatorConstraint({ name: 'isDecimalAmount', async: false })
class IsDecimalAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && /^\d{1,13}(\.\d{1,4})?$/.test(value) && Number(value) > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a positive decimal amount, e.g. "25000.00".`;
  }
}

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'Select a valid client.' })
  clientId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'Select a valid project.' })
  projectId!: string;

  @ApiProperty({ example: '2026-01-20' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ example: '25000.00' })
  @IsString()
  @Validate(IsDecimalAmountConstraint)
  amount!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  transactionReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trim)
  notes?: string;

  @ApiPropertyOptional({ description: 'Path/key of a previously uploaded attachment' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentPath?: string;
}

class UpdatePaymentBaseDto {
  @ApiPropertyOptional({ example: '2026-01-20' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  transactionReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trim)
  notes?: string;
}

export class UpdatePaymentDto extends PartialType(UpdatePaymentBaseDto) {}

export class VoidPaymentDto {
  @ApiProperty({ example: 'Duplicate entry — recorded in error' })
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to void a payment.' })
  @MaxLength(255)
  reason!: string;
}

/**
 * Every filter here is applied in Postgres via QueryBuilder, with one
 * documented exception: `minAmount`/`maxAmount`. Payment amounts are
 * AES-256-GCM ciphertext, so no SQL predicate can compare them — they are
 * filtered after decryption and are therefore only honoured while the
 * financial session is unlocked (see PaymentsService.findAll).
 */
export class QueryPaymentDto extends PaginatedDateFilterQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid', description: 'Administrator who recorded the payment' })
  @IsOptional()
  @IsUUID('4')
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Exact or partial receipt number' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  receiptNumber?: string;

  @ApiPropertyOptional({ description: 'Exact or partial transaction reference' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  transactionReference?: string;

  @ApiPropertyOptional({
    example: '10000.00',
    description: 'Applied post-decryption; requires an unlocked financial session.',
  })
  @IsOptional()
  @Transform(trim)
  @Validate(IsDecimalAmountConstraint)
  minAmount?: string;

  @ApiPropertyOptional({
    example: '500000.00',
    description: 'Applied post-decryption; requires an unlocked financial session.',
  })
  @IsOptional()
  @Transform(trim)
  @Validate(IsDecimalAmountConstraint)
  maxAmount?: string;
}

export class PaymentResponseDto {
  @ApiProperty() id!: string;

  // ── Client ──
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiPropertyOptional() clientEmail!: string | null;
  @ApiPropertyOptional() clientPhone!: string | null;

  // ── Project ──
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiPropertyOptional() projectCode!: string | null;
  @ApiProperty({ description: 'False for variable projects — render "Not Defined", never ₹0.' })
  hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;

  // ── Payment ──
  @ApiProperty() paymentDate!: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiPropertyOptional() transactionReference!: string | null;
  @ApiPropertyOptional() bankAccount!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiPropertyOptional() voidReason!: string | null;
  @ApiProperty() financialLocked!: boolean;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;

  // ── Receipt ──
  @ApiPropertyOptional() receiptId!: string | null;
  @ApiPropertyOptional() receiptNumber!: string | null;
  @ApiPropertyOptional() receiptDate!: string | null;

  // ── Admin / audit ──
  @ApiPropertyOptional() createdByName!: string | null;
  @ApiPropertyOptional() updatedByName!: string | null;
  @ApiPropertyOptional() voidedByName!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

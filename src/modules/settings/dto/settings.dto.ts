import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trim)
  companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @Transform(trim) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(24) @Transform(trim) phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Transform(trim)
  website?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) @Transform(trim) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) @Transform(trim) state?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(trim)
  postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) @Transform(trim) country?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(trim)
  taxNumber?: string;
  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
  @ApiPropertyOptional({ example: '₹' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currencySymbol?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  currencyPrecision?: number;
  @ApiPropertyOptional({ example: 'dd MMM yyyy' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dateFormat?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trim)
  receiptFooterNote?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  authorizedSignatory?: string;
}

export class ChangeLoginPasswordDto {
  @ApiProperty() @IsString() currentPassword!: string;
  @ApiProperty({ minLength: 10 }) @IsString() @MaxLength(200) newPassword!: string;
  @ApiProperty() @IsString() confirmPassword!: string;
}

export class ChangeAccountPasswordDto {
  @ApiPropertyOptional({ description: 'Omit only when no account password has ever been set' })
  @IsOptional()
  @IsString()
  currentAccountPassword?: string;

  @ApiProperty({ minLength: 10 }) @IsString() @MaxLength(200) newAccountPassword!: string;
  @ApiProperty() @IsString() confirmAccountPassword!: string;
}

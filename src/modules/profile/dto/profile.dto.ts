import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserStatus } from 'src/common/enums/user-status.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/**
 * The signed-in administrator's own record.
 *
 * Deliberately absent: password hashes of either kind, token version, failed
 * login counters, lockout timestamps and every encryption detail. The shape is
 * built field by field rather than by serialising the entity, so a column added
 * to `users` later cannot leak through this endpoint by default.
 */
export class ProfileResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ description: 'Mobile number — also usable as a login identifier' })
  phone!: string | null;
  @ApiProperty({ description: 'Role name, e.g. SUPER_ADMIN' }) role!: string;
  @ApiProperty({ description: 'Human-readable role label' }) roleDisplayName!: string;
  @ApiProperty({ isArray: true, type: String }) permissions!: string[];
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiPropertyOptional({ nullable: true }) lastLoginAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({
    description: 'Whether a finance password has been set. The hash itself is never returned.',
  })
  hasFinancePassword!: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Akshay Boricha' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    example: 'admin@devstree.local',
    description: 'Changing this changes the address you sign in with.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(180)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'Enter a valid mobile number.' })
  @Transform(trim)
  phone?: string;
}

/**
 * ── Password terminology ────────────────────────────────────────────────────
 *
 * The admin panel names the two credentials from the administrator's point of
 * view; the database columns were named earlier from the feature's point of
 * view. They map like this and must not be confused:
 *
 *   UI "Account Password"  → users.password_hash          → sign-in
 *   UI "Finance Password"  → users.account_password_hash  → financial unlock
 *
 * Changing one never touches the other.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Sign-in password. */
export class UpdateAccountPasswordDto {
  @ApiProperty({ description: 'The password currently used to sign in' })
  @IsString()
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MaxLength(200)
  newPassword!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  confirmPassword!: string;
}

/** Financial-unlock password. Separate credential, separate hash. */
export class UpdateFinancePasswordDto {
  @ApiPropertyOptional({
    description: 'Omit only when no finance password has ever been set for this account.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentFinancePassword?: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MaxLength(200)
  newFinancePassword!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  confirmFinancePassword!: string;
}

export class PasswordUpdateResponseDto {
  @ApiProperty({ example: 'Account password updated.' }) message!: string;
  @ApiProperty({
    example: true,
    description: 'True when the change invalidated the current sign-in session.',
  })
  reauthenticationRequired!: boolean;
}

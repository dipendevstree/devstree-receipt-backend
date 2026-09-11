import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address or registered mobile number',
    example: 'admin@devstree.local',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or mobile number is required.' })
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  identifier!: string;

  @ApiProperty({ example: '••••••••' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MaxLength(200)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@devstree.local' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  newPassword!: string;
}

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() phone!: string | null;
  @ApiProperty() role!: string;
  @ApiProperty({ isArray: true, type: String }) permissions!: string[];
  @ApiProperty() hasAccountPassword!: boolean;
}

export class LoginResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ example: 3600, description: 'Access token lifetime in seconds' })
  expiresIn!: number;
  @ApiProperty({
    example: '2026-09-09T19:00:00.000Z',
    description:
      'Absolute end of the login session. Unaffected by token refresh and unrelated to the financial unlock window.',
  })
  sessionExpiresAt!: Date;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh token to revoke; omit to revoke the current session only',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

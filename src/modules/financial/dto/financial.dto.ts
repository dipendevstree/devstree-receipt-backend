import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnlockFinancialDto {
  @ApiProperty({
    description: 'The account password — separate from the login password.',
    example: '••••••••',
  })
  @IsString()
  @IsNotEmpty({ message: 'Account password is required.' })
  @MaxLength(200)
  accountPassword!: string;
}

export class FinancialStatusResponseDto {
  @ApiProperty({ example: false })
  unlocked!: boolean;

  @ApiProperty({ required: false, nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ example: 0, description: 'Seconds remaining on the unlock session' })
  expiresInSeconds!: number;

  @ApiProperty({ example: 15 })
  unlockDurationMinutes!: number;
}

export class UnlockFinancialResponseDto extends FinancialStatusResponseDto {
  @ApiProperty({
    description:
      'Opaque unlock token. Send it as the x-financial-token header on subsequent requests. Keep it in memory only — never in localStorage or a cookie.',
  })
  token!: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: T;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Invalid account password' })
  message!: string;

  @ApiProperty({ example: 'INVALID_ACCOUNT_PASSWORD' })
  code!: string;

  @ApiProperty({ required: false, type: Object })
  details?: Record<string, unknown>;
}

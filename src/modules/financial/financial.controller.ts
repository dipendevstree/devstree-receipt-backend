import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FINANCIAL_UNLOCK_HEADER } from 'src/common/constants/app.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  FinancialStatusResponseDto,
  UnlockFinancialDto,
  UnlockFinancialResponseDto,
} from './dto/financial.dto';
import { FinancialUnlockService } from './services/financial-unlock.service';

@ApiTags('Financial Security')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  constructor(private readonly unlockService: FinancialUnlockService) {}

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  // Brute-force protection on top of the per-user lockout in the service.
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Unlock financial information',
    description:
      'Verifies the account password and opens a short-lived unlock session. The returned token must be sent as the x-financial-token header. Neither the account password nor any encryption key is returned.',
  })
  @ApiOkResponse({ type: UnlockFinancialResponseDto })
  async unlock(
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @Body() dto: UnlockFinancialDto,
  ): Promise<UnlockFinancialResponseDto> {
    const result = await this.unlockService.unlock(user, dto.accountPassword, context);
    return {
      token: result.token,
      unlocked: true,
      expiresAt: result.expiresAt.toISOString(),
      expiresInSeconds: result.expiresInSeconds,
      unlockDurationMinutes: Math.round(result.expiresInSeconds / 60),
    };
  }

  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock financial information immediately' })
  @ApiOkResponse({ type: FinancialStatusResponseDto })
  async lock(
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<FinancialStatusResponseDto> {
    await this.unlockService.lock(user, context);
    return this.unlockService.status(user.id, null).then(serializeStatus);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Current financial unlock state',
    description: 'Server-side truth. The frontend must never infer unlock state on its own.',
  })
  @ApiOkResponse({ type: FinancialStatusResponseDto })
  async status(
    @CurrentUser() user: AuthenticatedUser,
    @Headers(FINANCIAL_UNLOCK_HEADER) token?: string,
  ): Promise<FinancialStatusResponseDto> {
    return this.unlockService.status(user.id, token).then(serializeStatus);
  }
}

function serializeStatus(status: {
  unlocked: boolean;
  expiresAt: Date | null;
  expiresInSeconds: number;
  unlockDurationMinutes: number;
}): FinancialStatusResponseDto {
  return {
    unlocked: status.unlocked,
    expiresAt: status.expiresAt ? status.expiresAt.toISOString() : null,
    expiresInSeconds: status.expiresInSeconds,
    unlockDurationMinutes: status.unlockDurationMinutes,
  };
}

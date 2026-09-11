import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext } from '../interfaces/authenticated-user.interface';

function clientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim().slice(0, 45);
  }
  return (request.ip ?? request.socket?.remoteAddress ?? null)?.slice(0, 45) ?? null;
}

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'];
    return {
      ipAddress: clientIp(request),
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : null,
    };
  },
);

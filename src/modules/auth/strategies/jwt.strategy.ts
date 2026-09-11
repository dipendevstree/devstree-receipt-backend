import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Permission } from 'src/common/enums/permission.enum';
import { AuthenticatedUser } from 'src/common/interfaces/authenticated-user.interface';
import { User } from 'src/modules/users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  /** Invalidates every issued token when credentials change. */
  tv: number;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * Every request re-reads the user, so a deactivated account or a changed
   * password takes effect immediately rather than at token expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: { role: { permissions: true } },
    });

    if (!user || !user.isActive()) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    if (user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Credentials changed. Please sign in again.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      permissions: (user.role?.permissions ?? []).map((p) => p.name as Permission),
      tokenId: payload.jti,
    };
  }
}

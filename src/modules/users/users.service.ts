import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { PasswordService } from 'src/modules/auth/services/password.service';
import { FinancialUnlockService } from 'src/modules/financial/services/financial-unlock.service';
import { Role } from 'src/modules/roles/entities/role.entity';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  UserLookupDto,
  UserResponseDto,
} from './dto/user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly financialUnlock: FinancialUnlockService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(query: QueryUserDto): Promise<PaginatedResult<UserResponseDto>> {
    const builder = this.users
      .createQueryBuilder('user')
      .addSelect('user.accountPasswordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.deleted_at IS NULL');

    if (query.status) builder.andWhere('user.status = :status', { status: query.status });
    if (query.roleId) builder.andWhere('user.role_id = :roleId', { roleId: query.roleId });
    if (query.search) {
      builder.andWhere('(user.name ILIKE :term OR user.email ILIKE :term)', {
        term: `%${query.search}%`,
      });
    }

    builder.orderBy('user.createdAt', query.sortOrder).skip(query.skip).take(query.limit);

    const [users, total] = await builder.getManyAndCount();
    return PaginatedResult.of(
      users.map((user) => this.toResponse(user)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return this.toResponse(await this.getOrFail(id));
  }

  /**
   * Lightweight, server-filtered list for the "Created By / Admin" dropdowns.
   * Carries no credentials, no permissions and no financial data — just enough
   * to label and filter by an administrator.
   */
  async lookup(search?: string, limit = 20): Promise<UserLookupDto[]> {
    const capped = Math.min(100, Math.max(1, Number(limit) || 20));
    const builder = this.users
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select(['user.id', 'user.name', 'user.email', 'role.displayName', 'role.name'])
      .where('user.deleted_at IS NULL');

    if (search) {
      builder.andWhere('(user.name ILIKE :term OR user.email ILIKE :term)', {
        term: `%${search}%`,
      });
    }

    const users = await builder.orderBy('user.name', 'ASC').limit(capped).getMany();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roleName: user.role?.displayName ?? user.role?.name ?? '',
    }));
  }

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<UserResponseDto> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw AppException.conflict(
        ErrorCode.DUPLICATE_EMAIL,
        'A user with this email already exists.',
      );
    }

    const role = await this.roles.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw AppException.badRequest(ErrorCode.NOT_FOUND, 'Selected role was not found.');
    }

    this.passwordService.assertStrength(dto.password, 'Password');

    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash: await this.passwordService.hash(dto.password),
      roleId: dto.roleId,
      status: dto.status ?? UserStatus.ACTIVE,
    });
    const saved = await this.users.save(user);
    saved.role = role;

    await this.auditLog.record({
      action: AuditAction.USER_CREATED,
      module: AuditModule.USERS,
      recordId: saved.id,
      description: `Created user ${saved.name} (${saved.email})`,
      newValue: { name: dto.name, email: dto.email, roleId: dto.roleId },
      actor,
      context,
    });

    return this.toResponse(saved);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<UserResponseDto> {
    const user = await this.getOrFail(id);
    const before = { name: user.name, roleId: user.roleId, status: user.status };

    if (dto.roleId && dto.roleId !== user.roleId) {
      const role = await this.roles.findOne({ where: { id: dto.roleId } });
      if (!role) {
        throw AppException.badRequest(ErrorCode.NOT_FOUND, 'Selected role was not found.');
      }
      user.roleId = dto.roleId;
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;

    const deactivating = dto.status === UserStatus.INACTIVE || dto.status === UserStatus.SUSPENDED;
    if (dto.status !== undefined) user.status = dto.status;

    await this.users.save(user);

    if (deactivating) {
      await this.authService.revokeAllRefreshTokens(user.id);
      await this.financialUnlock.revokeActiveSessions(user.id);
    }

    await this.auditLog.record({
      action: AuditAction.USER_UPDATED,
      module: AuditModule.USERS,
      recordId: user.id,
      description: `Updated user ${user.name}`,
      oldValue: before,
      newValue: { name: user.name, roleId: user.roleId, status: user.status },
      actor,
      context,
    });

    return this.findOne(id);
  }

  async archive(id: string, actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    if (id === actor.id) {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'You cannot deactivate your own account.',
      );
    }

    const user = await this.getOrFail(id);
    await this.users.softDelete(id);
    await this.authService.revokeAllRefreshTokens(id);
    await this.financialUnlock.revokeActiveSessions(id);

    await this.auditLog.record({
      action: AuditAction.USER_ARCHIVED,
      module: AuditModule.USERS,
      recordId: id,
      description: `Archived user ${user.name}`,
      actor,
      context,
    });
  }

  private async getOrFail(id: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.accountPasswordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id })
      .andWhere('user.deleted_at IS NULL')
      .getOne();
    if (!user) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'User not found.');
    }
    return user;
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      hasAccountPassword: Boolean(user.accountPasswordHash),
      createdAt: user.createdAt,
    };
  }
}

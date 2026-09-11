import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { AppException } from 'src/common/exceptions/app.exception';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private readonly roles: Repository<Role>) {}

  async findAll(): Promise<Role[]> {
    return this.roles.find({ order: { displayName: 'ASC' } });
  }

  async getOrFail(id: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Role not found.');
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roles.findOne({ where: { name }, relations: { permissions: true } });
  }
}

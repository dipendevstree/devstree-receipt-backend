import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'List roles available for assignment' })
  findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
  UserLookupDto,
  UserResponseDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'List administration users' })
  findAll(@Query() query: QueryUserDto): Promise<PaginatedResult<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get('lookup')
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({
    summary: 'Searchable administrator list for filter dropdowns',
    description: 'Server-side filtered. Returns id/name/email/role only.',
  })
  lookup(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<UserLookupDto[]> {
    return this.usersService.lookup(search, Number(limit) || 20);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'User details' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.USERS_CREATE)
  @ApiOperation({ summary: 'Create an administration user' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USERS_UPDATE)
  @ApiOperation({ summary: 'Update a user (role, status, profile)' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user, context);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USERS_DELETE)
  @ApiOperation({ summary: 'Deactivate a user' })
  async archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.usersService.archive(id, user, context);
    return { message: 'User deactivated.' };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Permission as PermissionKey } from 'src/common/enums/permission.enum';
import { Role } from './role.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @ApiProperty({ enum: PermissionKey, example: PermissionKey.CLIENTS_VIEW })
  @Index('idx_permissions_name', { unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  name!: PermissionKey;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  group!: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}

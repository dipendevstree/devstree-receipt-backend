import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { PermissionEntity } from './permission.entity';

@Entity('roles')
export class Role extends SoftDeletableEntity {
  @ApiProperty({ example: 'ADMIN' })
  @Index('idx_roles_name', { unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  name!: string;

  @ApiProperty()
  @Column({ name: 'display_name', type: 'varchar', length: 96 })
  displayName!: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  /** System roles cannot be deleted or renamed. */
  @ApiProperty()
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, { eager: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionEntity[];

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}

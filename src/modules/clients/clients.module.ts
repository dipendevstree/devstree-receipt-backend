import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { MasterItem } from 'src/modules/masters/entities/master-item.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { ClientsImportService } from './services/clients-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Project, MasterItem]), AuditLogsModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsImportService],
  exports: [ClientsService],
})
export class ClientsModule {}

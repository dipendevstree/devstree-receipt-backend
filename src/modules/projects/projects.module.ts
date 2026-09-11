import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { Client } from 'src/modules/clients/entities/client.entity';
import { ImportsModule } from 'src/modules/imports/imports.module';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsImportService } from './services/projects-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Client, Payment]), AuditLogsModule, ImportsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsImportService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

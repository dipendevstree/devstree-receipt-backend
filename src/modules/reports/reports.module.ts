import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/modules/clients/entities/client.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportExportService } from './services/report-export.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Project, Payment])],
  controllers: [ReportsController],
  providers: [ReportsService, ReportExportService],
})
export class ReportsModule {}

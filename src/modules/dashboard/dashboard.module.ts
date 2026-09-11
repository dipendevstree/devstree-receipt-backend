import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { Client } from 'src/modules/clients/entities/client.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Project, Payment, Receipt, AuditLog])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

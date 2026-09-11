import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { Client } from 'src/modules/clients/entities/client.entity';
import { ImportsModule } from 'src/modules/imports/imports.module';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsImportService } from './services/payments-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Project, Client, Receipt]),
    AuditLogsModule,
    ImportsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsImportService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

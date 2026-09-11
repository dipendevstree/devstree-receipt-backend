import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { Receipt } from './entities/receipt.entity';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptPdfService } from './services/receipt-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Receipt]), AuditLogsModule, SettingsModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptPdfService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}

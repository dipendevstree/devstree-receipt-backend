import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { MasterItem } from './entities/master-item.entity';
import { MastersController } from './masters.controller';
import { MastersService } from './masters.service';
import { MastersImportService } from './services/masters-import.service';

@Module({
  imports: [TypeOrmModule.forFeature([MasterItem]), AuditLogsModule],
  controllers: [MastersController],
  providers: [MastersService, MastersImportService],
  exports: [MastersService],
})
export class MastersModule {}

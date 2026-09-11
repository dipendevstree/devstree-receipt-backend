import { Global, Module } from '@nestjs/common';
import { ExcelService } from './excel.service';

/**
 * Global so every module importer can depend on one Excel implementation
 * instead of instantiating ExcelJS of its own.
 */
@Global()
@Module({
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}

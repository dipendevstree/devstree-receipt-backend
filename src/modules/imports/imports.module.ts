import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/modules/clients/entities/client.entity';
import { MasterItem } from 'src/modules/masters/entities/master-item.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { ImportsController } from './imports.controller';
import { ImportReferenceService } from './services/import-reference.service';

/**
 * Cross-module import plumbing: the shared "download the failed rows" endpoint
 * and the reference resolver that turns names and codes typed into a sheet into
 * database records.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Client, Project, MasterItem])],
  controllers: [ImportsController],
  providers: [ImportReferenceService],
  exports: [ImportReferenceService],
})
export class ImportsModule {}

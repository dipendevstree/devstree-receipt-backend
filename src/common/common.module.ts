import { Global, Module } from '@nestjs/common';
import { PasswordService } from 'src/modules/auth/services/password.service';
import { SequenceService } from './services/sequence.service';

/**
 * Stateless primitives needed across modules. Global so hashing and sequence
 * allocation don't force circular module imports.
 */
@Global()
@Module({
  providers: [PasswordService, SequenceService],
  exports: [PasswordService, SequenceService],
})
export class CommonModule {}

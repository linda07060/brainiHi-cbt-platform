import { Module } from '@nestjs/common';
import { EnforcementService } from './enforcement.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [EnforcementService],
  exports: [EnforcementService],
})
export class EnforcementModule {}
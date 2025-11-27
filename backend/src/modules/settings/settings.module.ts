import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './settings.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PublicSettingsController } from './public-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingsService],
  controllers: [SettingsController, PublicSettingsController], // <--- add public controller
  exports: [SettingsService],
})
export class SettingsModule {}
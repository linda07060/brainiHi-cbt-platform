import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAnswer } from './security-answer.entity';
import { SecurityResetService } from './security-reset.service';
import { SecurityResetController } from './security-reset.controller';
import { User } from '../user/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityAnswer, User]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SecurityResetService],
  controllers: [SecurityResetController],
  exports: [SecurityResetService],
})
export class SecurityResetModule {}
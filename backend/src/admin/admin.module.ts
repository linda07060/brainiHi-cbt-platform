import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthGuard } from './admin-auth.guard';
import { User } from '../user/user.entity';
import { SecurityAnswer } from '../security-reset/security-answer.entity';

@Module({
  imports: [
    ConfigModule,
    // Register repositories used by admin service
    TypeOrmModule.forFeature([Admin, User, SecurityAnswer]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET') || configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AdminService, AdminJwtStrategy, AdminAuthGuard],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
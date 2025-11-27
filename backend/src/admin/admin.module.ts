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
import { AdminDebugController } from './debug.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

// New: Admin stats controller and AiLog entity
// import { AdminStatsController } from './admin-stats.controller';
import { AiLog } from '../ai/entities/ai-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Admin, User, SecurityAnswer, AiLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET') || configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AdminService, AdminJwtStrategy, AdminAuthGuard, AdminUsersService],
  // NOTE: AdminUsersController is listed BEFORE AdminController so specific routes
  // like /admin/users/activity-raw and /admin/users/activity-post are matched before
  // the parameterized /admin/users/:id route.
  controllers: [AdminUsersController, AdminController, AdminDebugController],
  exports: [AdminService, AdminJwtStrategy, AdminAuthGuard, AdminUsersService],
})
export class AdminModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { AdminModule } from './admin/admin.module';
import { PlanModule } from './plan/plan.module';
import { AiModule } from './ai/ai.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { EnforceResetGuard } from './auth/enforce-reset.guard';
import { SetupSecurityController } from './auth/setup-security.controller';
import { SetupSecurityService } from './auth/setup-security.service';

// Payments module and paid-access guard
import { PaymentsModule } from './payments/payments.module';
import { PaidAccessGuard } from './common/guards/paid-access.guard';

// Dashboard controller (protected)
import { DashboardController } from './dashboard/dashboard.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL') || config.get<string>('TYPEORM_DATABASE_URL');
        const host = config.get<string>('DB_HOST') || 'localhost';
        const port = Number(config.get<number>('DB_PORT') ?? 5432);
        const username = config.get<string>('DB_USER') || config.get<string>('DB_USERNAME') || 'postgres';
        const password = config.get<string>('DB_PASS') || config.get<string>('DB_PASSWORD') || '';
        const database = config.get<string>('DB_NAME') || 'cbt_platform';
        const url = databaseUrl ?? `postgres://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

        const dbSslEnv = (config.get<string>('DB_SSL') || '').toLowerCase();
        let ssl: any = false;
        if (dbSslEnv === 'true') {
          ssl = {
            rejectUnauthorized: String(config.get('DB_SSL_REJECT_UNAUTHORIZED') || 'false').toLowerCase() === 'true',
          };
        } else if ((databaseUrl || '').includes('render.com') || ((databaseUrl || '').startsWith('postgres://') && process.env.NODE_ENV === 'production')) {
          ssl = { rejectUnauthorized: false };
        } else {
          ssl = false;
        }

        const syncOpt = String(config.get('TYPEORM_SYNC') || '').toLowerCase() === 'true';

        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: syncOpt,
          ssl,
        } as any;
      },
    }),

    UserModule,
    AuthModule,
    TestModule,
    AdminModule,
    PlanModule,
    AiModule,
    SettingsModule,
    PaymentsModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'replace-with-prod-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    SetupSecurityController,
    DashboardController, // register protected dashboard controller here
  ],
  providers: [
    SetupSecurityService,

    // global maintenance guard
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },

    // enforce reset guard globally
    {
      provide: APP_GUARD,
      useClass: EnforceResetGuard,
    },

    // Provide the PaidAccessGuard so Nest can inject PaymentsService into it
    PaidAccessGuard,
  ],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { AdminModule } from './admin/admin.module';
import { PlanModule } from './plan/plan.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // If DATABASE_URL is set, use it. Otherwise use local variables.
        if (config.get('DATABASE_URL')) {
          return {
            type: 'postgres',
            url: config.get('DATABASE_URL'),
            autoLoadEntities: true,
            synchronize: true,
            ssl: { rejectUnauthorized: false }, // required for Railway/Render!
          };
        } else {
          return {
            type: 'postgres',
            host: config.get('DB_HOST'),
            port: parseInt(config.get('DB_PORT'), 10),
            username: config.get('DB_USER'),
            password: config.get('DB_PASS'),
            database: config.get('DB_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          };
        }
      },
    }),

    UserModule,
    AuthModule,
    TestModule,
    AdminModule,
    PlanModule,
    AiModule,
  ],
})
export class AppModule {}
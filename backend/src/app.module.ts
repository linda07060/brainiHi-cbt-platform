import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { AdminModule } from './admin/admin.module';
import { PlanModule } from './plan/plan.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Load .env variables globally
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    // Application modules
    UserModule,
    AuthModule,
    TestModule,
    AdminModule,
    PlanModule,
    AiModule,
  ],
})
export class AppModule {}
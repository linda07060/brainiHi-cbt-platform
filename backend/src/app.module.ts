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
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgres://cbt_platform_db_user:L5HcqeluiammtS2PXqAgKRbCOdNJj3Lp@dpg-d3uld2odl3ps73f84seg-a.oregon-postgres.render.com:5432/cbt_platform_db',
      autoLoadEntities: true,
      synchronize: true, // Set to false in production!
      ssl: { rejectUnauthorized: false }, // SSL required for Render and most cloud DBs
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
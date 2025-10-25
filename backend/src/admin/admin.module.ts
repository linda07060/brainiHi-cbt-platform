import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AdminService, AdminJwtStrategy],
  controllers: [AdminController],
  exports: [TypeOrmModule, AdminService],
})
export class AdminModule {}
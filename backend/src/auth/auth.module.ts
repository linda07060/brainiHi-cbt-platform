import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { SecurityResetModule } from '../security-reset/security-reset.module';
import { User } from '../user/user.entity';
import { SecurityAnswer } from '../security-reset/security-answer.entity';
import { MailModule } from '../mail/mail.module'; // <- added import

@Module({
  imports: [
    ConfigModule,
    UserModule,
    SecurityResetModule,
    // Register repositories used by AuthService so they can be injected here
    TypeOrmModule.forFeature([User, SecurityAnswer]),
    MailModule, // <- ensure MailService is provided/exported by MailModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
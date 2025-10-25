import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Add this line for debugging
    console.log('JwtStrategy.validate called with payload:', payload);
    // You may customize this return value as needed
    return { userId: payload.sub, email: payload.email, name: payload.name, role: payload.role, plan: payload.plan, level: payload.level, plan_expiry: payload.plan_expiry };
  }
}
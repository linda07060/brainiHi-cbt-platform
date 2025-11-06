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
    // Keep a small dev-only log, but avoid logging in production
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('JwtStrategy.validate called with payload:', payload);
    }

    // Return the original payload as-is so controllers/services can read payload.sub
    // (or you can return a mapped object that still contains `sub`).
    return payload;
  }
}
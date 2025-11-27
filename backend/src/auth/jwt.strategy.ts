import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Try multiple config keys / env vars so tokens signed with either secret are accepted in mixed environments.
      secretOrKey:
        configService.get<string>('JWT_SECRET') ??
        process.env.JWT_SECRET ??
        configService.get<string>('SECURITY_SECRET') ??
        process.env.SECURITY_SECRET,
    });
  }

  async validate(payload: any) {
    // Keep a small dev-only log, but avoid logging in production
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug('JwtStrategy.validate called with payload: ' + JSON.stringify(payload));
    }

    // Return the original payload as-is so controllers/services can read payload.sub
    return payload;
  }
}
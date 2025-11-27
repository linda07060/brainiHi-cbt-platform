import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // Override handleRequest to provide better diagnostics and fail fast on missing/invalid token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Log inputs for debugging (kept minimal)
    if (process.env.NODE_ENV !== 'production') {
      try {
        this.logger.debug(
          `JwtAuthGuard.handleRequest user=${JSON.stringify(user)} info=${JSON.stringify(info)} err=${err?.message ?? err}`,
        );
      } catch {
        // ignore stringify errors
      }
    }

    if (err) {
      // If Passport or strategy returned an error, log and rethrow as Unauthorized
      this.logger.warn('JwtAuthGuard encountered error in strategy: ' + (err?.message ?? String(err)));
      throw new UnauthorizedException('Authentication failed');
    }

    if (!user) {
      // Provide a clear message and log reason (info may contain strategy details like TokenExpiredError)
      const infoMsg = info ? (info.message ?? JSON.stringify(info)) : 'no additional info';
      this.logger.warn('JwtAuthGuard: no user attached by strategy; info=' + infoMsg);
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
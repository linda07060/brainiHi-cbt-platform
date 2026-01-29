import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaidAccessGuard } from '../common/guards/paid-access.guard';

/**
 * DashboardController
 *
 * Protected by:
 *  - JwtAuthGuard (authentication)
 *  - PaidAccessGuard (requires either free plan OR a completed/valid payment)
 *
 * Any request that reaches these handlers will only succeed when the user has
 * been authenticated and the PaidAccessGuard allows access. Otherwise the guard
 * will throw a 403 and the client should redirect to the subscription/checkout flow.
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PaidAccessGuard)
export class DashboardController {
  @Get('data')
  getData() {
    // Minimal example payload. Replace with your real dashboard logic.
    return {
      message: 'Protected dashboard data — user is authenticated and has payment access.',
      timestamp: new Date().toISOString(),
    };
  }
}
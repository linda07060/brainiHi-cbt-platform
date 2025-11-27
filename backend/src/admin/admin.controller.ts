import { Controller, Post, Body, Get, UseGuards, Req, Query, Param, ParseIntPipe, Put, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminUsersService } from './admin-users.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminUsersService: AdminUsersService,
  ) {}

  // Admin login (kept for backward compatibility)
  @Post('auth/login')
  async login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body);
  }

  // Admin dashboard welcome (protected)
  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  getDashboard(@Req() req) {
    return { message: `Welcome admin ${req.user.email}` };
  }

  // Stats for admin dashboard
  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getStats() {
    return this.adminService.getStats();
  }

  // Activity endpoints (placed before the parameterized user routes to avoid route collisions)

  // GET /admin/users/activity-raw?email=... or ?user_id=...
  @Get('users/activity-raw')
  @UseGuards(AdminAuthGuard)
  async getActivityRaw(@Query('email') email?: string, @Query('user_id') userId?: string) {
    // Prefer numeric user_id when provided
    if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
      const idNum = Number(userId);
      if (!Number.isFinite(idNum)) {
        // return empty array for invalid id rather than throwing ParseIntPipe error
        return [];
      }
      return this.adminUsersService.getActivityByUserId(idNum);
    }
    if (email && String(email).trim() !== '') {
      return this.adminUsersService.getActivityByEmail(String(email).trim());
    }
    return [];
  }

  // POST /admin/users/activity-post
  // body: { email?: string, user_id?: number }
  @Post('users/activity-post')
  @UseGuards(AdminAuthGuard)
  async postActivity(@Body() body: { email?: string; user_id?: number }) {
    if (body?.user_id !== undefined && body?.user_id !== null) {
      const idNum = Number(body.user_id);
      if (!Number.isFinite(idNum)) return [];
      return this.adminUsersService.getActivityByUserId(idNum);
    }
    if (body?.email && String(body.email).trim() !== '') {
      return this.adminUsersService.getActivityByEmail(String(body.email).trim());
    }
    return [];
  }

  // List users with optional q, page, limit
  @Get('users')
  @UseGuards(AdminAuthGuard)
  async listUsers(@Query('q') q?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    return this.adminService.listUsers(q, p, l);
  }

  // Get specific user
  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUser(id);
  }

  // Update user (admin)
  @Put('users/:id')
  @UseGuards(AdminAuthGuard)
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.updateUser(id, body);
  }

  // Reset password: body { newPassword? } -> returns tempPassword if generated
  @Post('users/:id/reset-password')
  @UseGuards(AdminAuthGuard)
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() body: { newPassword?: string }) {
    if (body.newPassword && body.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    return this.adminService.resetPassword(id, body.newPassword);
  }

  // Reset security (admin sets new recovery passphrase or security answers)
  @Post('users/:id/reset-security')
  @UseGuards(AdminAuthGuard)
  async resetSecurity(@Param('id', ParseIntPipe) id: number, @Body() body: { recoveryPassphrase?: string; securityAnswers?: Array<{ questionKey: string; answer: string }> }) {
    return this.adminService.resetSecurity(id, body);
  }
}
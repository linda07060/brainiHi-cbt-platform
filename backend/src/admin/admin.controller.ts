import { Controller, Post, Body, Get, UseGuards, Req, Query, Param, ParseIntPipe, Put, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
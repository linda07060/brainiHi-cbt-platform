import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('auth/login')
  async login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body);
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  getDashboard(@Req() req) {
    return { message: `Welcome admin ${req.user.email}` };
  }

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  getStats() {
    // Stub for admin dashboard stats (users, tests, plans)
    return {
      users: 100, // replace with real query
      tests: 250, // replace with real query
      activePlans: 35, // replace with real query
    };
  }
}
import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

/**
 * Minimal UserController — named export required by user.module.ts.
 * Uses simple types for request bodies to avoid requiring DTO files.
 * Adjust routes/guards/validation as needed for your application.
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(Number(id));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Post()
  async create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.userService.update(Number(id), body);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userService.remove(Number(id));
    return { success: true };
  }
}
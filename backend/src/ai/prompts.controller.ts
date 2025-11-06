import { Controller, Get, UseGuards, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { PromptsService } from './prompts.service';

/**
 * Admin controller to manage AI prompt templates stored in the DB.
 * All routes protected by AdminAuthGuard.
 */
@Controller('admin/prompts')
@UseGuards(AdminAuthGuard)
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Get()
  async list() {
    return { items: await this.prompts.listAll() };
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    return { item: await this.prompts.getByKey(key) };
  }

  /**
   * Upsert full set or a single key.
   * Body for single upsert:
   * { key: string, template: string, description?: string, metadata?: any }
   */
  @Post()
  async createOrUpdate(@Body() body: any) {
    const { key, template, description, metadata } = body;
    if (!key || !template) throw new Error('key and template are required');
    const item = await this.prompts.upsert(key, template, description, metadata);
    return { item };
  }

  @Put(':key')
  async update(@Param('key') key: string, @Body() body: any) {
    const { template, description, metadata } = body;
    if (!template) throw new Error('template required');
    const item = await this.prompts.upsert(key, template, description, metadata);
    return { item };
  }

  @Delete(':key')
  async remove(@Param('key') key: string) {
    await this.prompts.delete(key);
    return { message: 'deleted' };
  }
}
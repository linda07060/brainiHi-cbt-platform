import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Res } from '@nestjs/common';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { AiLogsAdminService } from './admin-ai-logs.service';
import { Response } from 'express';

@Controller('admin/ai-logs')
@UseGuards(AdminAuthGuard)
export class AdminAiLogsController {
  constructor(private readonly service: AiLogsAdminService) {}

  /**
   * Streaming export for many logs (CSV) - placed before dynamic routes to avoid route collision.
   * Example: GET /admin/ai-logs/export?model=openai&success=true&userId=42
   */
  @Get('export')
  async exportMany(@Query() query: any, @Res() res: Response) {
    // Extract typed values from the generic query object
    const userId = query?.userId ? Number(query.userId) : undefined;
    const model = query?.model;
    const success = typeof query?.success === 'string' ? query.success === 'true' : undefined;

    // Ensure response headers for download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ai-logs-export-${Date.now()}.csv"`);

    // Delegate streaming to service
    await this.service.streamExport({ userId, model, success }, res);
    return;
  }

  // GET /admin/ai-logs?userId=&model=&success=&page=&limit=
  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('model') model?: string,
    @Query('success') success?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(500, Number(limit) || 50);
    return this.service.list({
      userId: userId ? Number(userId) : undefined,
      model,
      success: typeof success === 'string' ? success === 'true' : undefined,
      page: p,
      limit: l,
    });
  }

  // GET /admin/ai-logs/:id
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  // GET /admin/ai-logs/:id/export (export single log's parsed question or raw response)
  @Get(':id/export')
  async exportOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const csv = await this.service.exportOneAsCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ai-log-${id}.csv"`);
    res.send(csv);
  }
}
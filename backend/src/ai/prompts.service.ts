import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt } from './entities/prompt.entity';

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  constructor(
    @InjectRepository(AiPrompt)
    private readonly promptsRepo: Repository<AiPrompt>,
  ) {}

  async listAll() {
    return this.promptsRepo.find({ order: { key: 'ASC' } });
  }

  async getByKey(key: string) {
    const item = await this.promptsRepo.findOne({ where: { key } });
    if (!item) throw new NotFoundException('Prompt not found');
    return item;
  }

  async upsert(key: string, template: string, description?: string, metadata?: any) {
    let item = await this.promptsRepo.findOne({ where: { key } });
    if (!item) {
      item = this.promptsRepo.create({ key, template, description: description ?? null, metadata: metadata ?? null });
    } else {
      item.template = template;
      item.description = description ?? item.description;
      item.metadata = metadata ?? item.metadata;
    }
    return this.promptsRepo.save(item);
  }

  async delete(key: string) {
    const item = await this.promptsRepo.findOne({ where: { key } });
    if (!item) throw new NotFoundException('Prompt not found');
    return this.promptsRepo.remove(item);
  }
}
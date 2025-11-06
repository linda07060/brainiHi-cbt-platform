import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiTutorService } from './ai.tutor.service';
import { AiTutorController } from './ai.tutor.controller';
import { AiTutorConversation } from './ai-tutor.entity';
import { TestAttempt } from '../test/test.entity';
import { AiUsage } from './ai-usage.entity';
import { UserModule } from '../user/user.module';

import { AiLog } from './entities/ai-log.entity';
import { GeneratedQuestion } from './entities/generated-question.entity';
import { SessionPerformance } from './entities/session-performance.entity';
import { AiPrompt } from './entities/prompt.entity';

import { GenerateV2Service } from './generate-v2.service';
import { GenerateV2Controller } from './generate-v2.controller';
import { AiLoggerService } from './ai-logger.service';
import { AiLogsAdminService } from './admin-ai-logs.service';
import { AdminAiLogsController } from './admin-ai-logs.controller';
import { DuplicateCheckerService } from './duplicate-checker.service';
import { EmbeddingsService } from './embeddings.service';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AiTutorConversation,
      TestAttempt,
      AiUsage,
      AiLog,
      GeneratedQuestion,
      SessionPerformance,
      AiPrompt, // added
    ]),
    forwardRef(() => UserModule),
  ],
  providers: [
    AiService,
    AiTutorService,
    GenerateV2Service,
    AiLoggerService,
    AiLogsAdminService,
    DuplicateCheckerService,
    EmbeddingsService,
    PromptsService, // added
  ],
  controllers: [AiController, AiTutorController, GenerateV2Controller, AdminAiLogsController, PromptsController],
  exports: [AiService, AiTutorService, GenerateV2Service],
})
export class AiModule {}
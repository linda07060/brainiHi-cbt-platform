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
// Import the merged controller (ai-logs.controller) which exports AdminAiLogsController
import { AdminAiLogsController } from './ai-logs.controller';
import { DuplicateCheckerService } from './duplicate-checker.service';
import { EmbeddingsService } from './embeddings.service';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { PromptsPreviewController } from './prompts-preview.controller';

// New imports for settings/enforcement wiring (additive & opt-in)
import { SettingsModule } from '../modules/settings/settings.module';
import { PlanEnforcementService } from './plan-enforcement.service';

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
      AiPrompt,
    ]),
    forwardRef(() => UserModule),
    // SettingsModule imported so SettingsService is available to AiModule and PlanEnforcementService
    SettingsModule,
  ],
  providers: [
    AiService,
    AiTutorService,
    GenerateV2Service,
    AiLoggerService,
    AiLogsAdminService,
    DuplicateCheckerService,
    EmbeddingsService,
    PromptsService,
    // Register PlanEnforcementService so it is available for opt-in enforcement.
    PlanEnforcementService,
  ],
  controllers: [
    AiController,
    AiTutorController,
    GenerateV2Controller,
    AdminAiLogsController, // merged controller
    PromptsController,
    PromptsPreviewController, // preview controller
  ],
  exports: [AiService, AiTutorService, GenerateV2Service, PlanEnforcementService],
})
export class AiModule {}
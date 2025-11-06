import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiTutorService } from './ai.tutor.service';
import { AiTutorController } from './ai.tutor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiTutorConversation } from './ai-tutor.entity';
import { TestAttempt } from '../test/test.entity';
import { AiUsage } from './ai-usage.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiTutorConversation, TestAttempt, AiUsage]),
    // Make UserService available inside AiModule. Use forwardRef to avoid circular import issues.
    forwardRef(() => UserModule),
  ],
  providers: [AiService, AiTutorService],
  controllers: [AiController, AiTutorController],
  exports: [AiService, AiTutorService],
})
export class AiModule {}
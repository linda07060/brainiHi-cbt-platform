import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestAttempt } from './test.entity';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { AiModule } from '../ai/ai.module';
import { AiUsage } from '../ai/ai-usage.entity';
import { UserModule } from '../user/user.module';

// FIXED import path: EnforcementModule lives under src/modules/enforcement
import { EnforcementModule } from '../modules/enforcement/enforcement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestAttempt, AiUsage]),
    AiModule,
    UserModule, // import so we can use UserService in TestController
    EnforcementModule, // <<-- ensures EnforcementService is available to TestController
  ],
  providers: [TestService],
  controllers: [TestController],
})
export class TestModule {}
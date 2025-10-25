import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestAttempt } from './test.entity';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { AiModule } from '../ai/ai.module'; // <-- Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([TestAttempt]),
    AiModule, // <-- Add this line
  ],
  providers: [TestService],
  controllers: [TestController],
})
export class TestModule {}
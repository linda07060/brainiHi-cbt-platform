import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[NestApplication] Server started on port ${port}`);
}
bootstrap();
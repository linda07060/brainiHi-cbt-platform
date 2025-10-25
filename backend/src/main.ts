import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow both Vercel frontend and localhost for development
  const allowedOrigins = [
    'https://braini-hi-cbt-platform.vercel.app', // Vercel production frontend
    'http://localhost:3000',                     // Local development frontend
  ];

  // If you use FRONTEND_ORIGIN env variable, add it dynamically
  if (process.env.FRONTEND_ORIGIN && !allowedOrigins.includes(process.env.FRONTEND_ORIGIN)) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[NestApplication] Server started on port ${port}`);
}
bootstrap();
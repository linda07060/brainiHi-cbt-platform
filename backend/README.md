# CBT Platform Backend

This is the backend for the AI-powered CBT platform.

## Features

- NestJS REST API (TypeScript)
- PostgreSQL (TypeORM)
- JWT Auth + Admin/Auth separation + Google OAuth2
- AI: OpenAI GPT-4o integration (test/explanation generator)
- User/admin dashboards, test/question logic, plan stub, notification stub
- Docker-ready, production-ready

## Setup

1. Copy `.env.example` to `.env` and set DB, JWT, OpenAI, Google keys.
2. Run migrations or let TypeORM create tables (`synchronize: true` for dev).
3. Start server:
   ```
   npm install
   npm run start:dev
   ```
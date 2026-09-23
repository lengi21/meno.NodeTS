import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const trustedOrigins = new Set([
    'http://localhost:4200',
    'https://localhost',
    'capacitor://localhost',
    ...((process.env.APP_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)),
  ]);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || trustedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin is not allowed: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(Number(process.env.PORT ?? 3001));
}
await bootstrap();

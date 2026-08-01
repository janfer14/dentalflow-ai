import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LOCAL_UPLOADS_DIR } from './modules/storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Local-disk fallback for uploaded files when S3 isn't configured (see
  // StorageService) — served cross-origin so the frontend can render them
  // directly, since helmet's default same-origin CORP would otherwise block
  // <img>/<a> loads from a different port/domain.
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use('/uploads', express.static(LOCAL_UPLOADS_DIR));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DentalFlow AI Enterprise API')
    .setDescription('API para gestión integral de clínicas dentales')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);

  console.log(`DentalFlow API listening on http://localhost:${port}/api/v1`);

  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
void bootstrap();

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { FINANCIAL_UNLOCK_HEADER } from './common/constants/app.constants';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 5001);
  const prefix = config.get<string>('app.apiPrefix', 'api');
  const isProduction = config.get<boolean>('app.isProduction', false);
  const corsOrigins = config.get<string[]>('app.corsOrigins', ['http://localhost:5000']);

  app.setGlobalPrefix(prefix);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', FINANCIAL_UNLOCK_HEADER],
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // Constraint text only; never echo the submitted value back.
      disableErrorMessages: false,
      validationError: { target: false, value: false },
    }),
  );

  app.enableShutdownHooks();

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Devstree Receipt System API')
      .setDescription(
        [
          'Client → Project → Payment → Receipt management with encrypted financial data.',
          '',
          '**Financial security:** every monetary value is stored as AES-256-GCM ciphertext.',
          'Decrypted amounts are returned only while a financial unlock session is active.',
          'Unlock with `POST /financial/unlock`, then send the returned token in the',
          `\`${FINANCIAL_UNLOCK_HEADER}\` header. While locked, amount fields are \`null\` —`,
          'the real value is never sent to the client.',
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addApiKey({ type: 'apiKey', name: FINANCIAL_UNLOCK_HEADER, in: 'header' }, 'financial-token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    });
    logger.log(`Swagger UI available at /${prefix}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Devstree Receipt API listening on port ${port} (${config.get('app.env')})`);
}

bootstrap().catch((error) => {
  // Configuration failures (missing encryption key, weak secrets) land here.
  new Logger('Bootstrap').error(
    `Application failed to start: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

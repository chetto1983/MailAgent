import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { getConfiguration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const config = getConfiguration();

  // Security middleware
  app.use(helmet());

  // CORS configuration - using centralized config
  app.enableCors({
    origin: config.api.corsOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,ngrok-skip-browser-warning',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Swagger documentation
  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MailAgent API')
      .setDescription('AI-powered multi-tenant email assistant API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Legacy route watchdog (email-configs)
  const legacyLogger = new Logger('LegacyRoutes');
  const httpAdapter = app.getHttpAdapter();
  const server: any = typeof httpAdapter.getInstance === 'function' ? httpAdapter.getInstance() : null;
  if (server?.use) {
    server.use('/email-configs', (req: any, res: any) => {
      const requestInfo = {
        method: req.method,
        url: req.originalUrl ?? req.url,
        ip: req.ip,
        userAgent: req.headers?.['user-agent'],
      };
      legacyLogger.warn('Legacy /email-configs endpoint accessed', requestInfo);
      res.status(410).json({
        message: 'This endpoint has been removed. Please migrate to /providers/*.',
        documentation: 'docs/implementation/PROVIDER_INTEGRATION_GUIDE.md',
      });
    });
  }

  await app.listen(config.api.port);
  logger.log(`🚀 Application is running on ${config.api.url}`);
  logger.log(`📊 Swagger docs available at ${config.api.url}/api/docs`);
  logger.log(`🗄️ Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  logger.log(`⚡ Redis: ${config.redis.host}:${config.redis.port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

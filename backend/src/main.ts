import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { getConfiguration } from './config/configuration';

/**
 * Bootstraps and starts the NestJS HTTP server with configured middleware, docs, legacy-route handling, and graceful shutdown.
 *
 * Configures proxy trust, Helmet security, CORS (allowlist, regex, or allow-all), global validation and exception filters, and Swagger when not in production. Mounts a legacy watchdog for /email-configs that responds 410, enables shutdown hooks, starts listening on the configured port, logs startup details (URL, Swagger, database, Redis), and registers SIGTERM/SIGINT handlers that attempt a graceful shutdown before exiting.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const config = getConfiguration();

  // Respect real client IPs behind reverse proxies (prevents rate-limit false positives)
  app.set('trust proxy', config.api.trustProxy);

  // Security middleware
  app.use(helmet());

  // CORS configuration - allowlist + regex + optional allow-all
  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin/SSR calls without origin
      if (!origin) {
        return callback(null, true);
      }

      if (config.api.corsAllowAll) {
        return callback(null, true);
      }

      if (config.api.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (config.api.corsRegexOrigins.some((regex) => regex.test(origin))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'ngrok-skip-browser-warning',
      'x-webhook-token',
    ],
    optionsSuccessStatus: 204,
    preflightContinue: false,
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

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(config.api.port);
  logger.log(`🚀 Application is running on ${config.api.url}`);
  logger.log(`📊 Swagger docs available at ${config.api.url}/api/docs`);
  logger.log(`🗄️ Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  logger.log(`⚡ Redis: ${config.redis.host}:${config.redis.port}`);

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

const bootstrapLogger = new Logger('Bootstrap');
bootstrap().catch((err) => {
  bootstrapLogger.error('Failed to start application:', err);
  process.exit(1);
});
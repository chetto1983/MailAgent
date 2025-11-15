import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmailModule } from './modules/email/email.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { EmailSyncModule } from './modules/email-sync/email-sync.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),
    // Rate limiting: 100 requests per 60 seconds by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    EmailModule,
    AiModule,
    HealthModule,
    AuditModule,
    ProvidersModule,
    EmailSyncModule,
    ComplianceModule,
    CalendarModule,
    ContactsModule,
    RealtimeModule, // WebSocket Gateway per eventi realtime multi-tenant
  ],
  providers: [
    // Apply throttler globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

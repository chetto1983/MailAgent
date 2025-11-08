/**
 * Configuration service
 * Builds derived variables from environment variables
 * No hardcoded values - everything comes from .env
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  url: string;
}

export interface ApiConfig {
  host: string;
  port: number;
  url: string;
  corsOrigins: string[];
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  otpExpiration: number;
  passwordResetExpiration: number;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromDomain: string;
}

export interface OAuthConfig {
  gmail: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  microsoft: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export interface AiConfig {
  mistral: {
    apiKey: string;
    model: string;
  };
}

export interface Configuration {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  api: ApiConfig;
  auth: AuthConfig;
  email: EmailConfig;
  oauth: OAuthConfig;
  ai: AiConfig;
  encryption: {
    aesSecretKey: string;
  };
  stt: {
    provider: string;
    googleApiKey?: string;
  };
  tts: {
    provider: string;
    piperLanguage?: string;
  };
}

/**
 * Load and build configuration from environment variables
 */
export function loadConfiguration(): Configuration {
  // Database configuration - built from components
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbUser = process.env.DB_USER || 'mailuser';
  const dbPassword = process.env.DB_PASSWORD || 'mailpass';
  const dbName = process.env.DB_NAME || 'mailagent';

  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

  // Redis configuration - built from components
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  // API configuration - built from components
  const apiHost = process.env.API_HOST || 'localhost';
  const apiPort = parseInt(process.env.API_PORT || '3000');
  const defaultApiUrl = `http://${apiHost}:${apiPort}`;
  const apiUrl = process.env.API_PUBLIC_URL || defaultApiUrl;

  // CORS origins
  const extraCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const corsOrigins = Array.from(
    new Set([
      apiUrl,
      `http://localhost:${apiPort}`,
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'https://localhost',
      'https://localhost:443',
      ...extraCorsOrigins,
    ].filter(Boolean)),
  );

  // OAuth redirect URIs - built from API_URL
  const gmailRedirectUri = `${apiUrl}/auth/gmail/callback`;
  const microsoftRedirectUri = `${apiUrl}/auth/microsoft/callback`;

  // SMTP config
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL || 'noreply';
  const smtpFromDomain = process.env.SMTP_FROM_DOMAIN || 'mailagent.local';

  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    logLevel: process.env.LOG_LEVEL || 'debug',

    database: {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      url: databaseUrl,
    },

    redis: {
      host: redisHost,
      port: redisPort,
      url: redisUrl,
    },

    api: {
      host: apiHost,
      port: apiPort,
      url: apiUrl,
      corsOrigins,
    },

    auth: {
      jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
      otpExpiration: parseInt(process.env.OTP_EXPIRATION || '900000'),
      passwordResetExpiration: parseInt(process.env.PASSWORD_RESET_EXPIRATION || '900000'),
    },

    email: {
      smtpHost: process.env.SMTP_HOST || 'localhost',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || 'mailuser',
      smtpPassword: process.env.SMTP_PASSWORD || 'mailpass',
      fromEmail: smtpFromEmail,
      fromDomain: smtpFromDomain,
    },

    oauth: {
      gmail: {
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        redirectUri: gmailRedirectUri,
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: microsoftRedirectUri,
      },
    },

    ai: {
      mistral: {
        apiKey: process.env.MISTRAL_API_KEY || '',
        model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      },
    },

    encryption: {
      aesSecretKey: process.env.AES_SECRET_KEY || 'default-key-change-in-production',
    },

    stt: {
      provider: process.env.STT_PROVIDER || 'google',
      googleApiKey: process.env.GOOGLE_STT_API_KEY,
    },

    tts: {
      provider: process.env.TTS_PROVIDER || 'piper',
      piperLanguage: process.env.PIPER_LANGUAGE || 'it_IT',
    },
  };
}

// Export singleton instance
let configInstance: Configuration | null = null;

export function getConfiguration(): Configuration {
  if (!configInstance) {
    configInstance = loadConfiguration();
  }
  return configInstance;
}

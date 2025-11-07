/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '24h';
process.env.AES_SECRET_KEY = 'test-aes-256-secret-key-32chars!';
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5432/mailagent_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.MISTRAL_API_KEY = '50yMLyTFFOyyqc1AqMLpE6Y5N4tT5GPW';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console.error to reduce noise in tests (optional)
// global.console.error = jest.fn();

// Global test utilities
global.testUtils = {
  generateMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    tenantId: 'test-tenant-id',
    role: 'user',
    firstName: 'Test',
    lastName: 'User',
  }),

  generateMockTenant: () => ({
    id: 'test-tenant-id',
    name: 'Test Tenant',
    slug: 'test-tenant',
    isActive: true,
  }),
};

// Extend Jest matchers (optional)
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },
});

// Declare global types
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        generateMockUser: () => any;
        generateMockTenant: () => any;
      };
    }
  }

  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
    }
  }
}

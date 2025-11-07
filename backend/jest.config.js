module.exports = {
  // Use ts-jest preset
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Roots
  roots: ['<rootDir>/src', '<rootDir>/test'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Test match patterns
  testRegex: '.*\\.spec\\.ts$',

  // Transform files with ts-jest
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)',
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/prisma/*.ts',
    '!src/workers/*.ts',
    '!src/**/*.mock.ts',
  ],

  // Coverage directory
  coverageDirectory: './coverage',

  // Coverage thresholds (will enforce quality)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files (run before tests)
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Max workers (for performance)
  maxWorkers: '50%',
};

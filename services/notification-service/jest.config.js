module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
        moduleResolution: 'node',
        types: ['jest', 'node'],
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/utils/logger.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
  clearMocks: true,
  restoreMocks: true,
};

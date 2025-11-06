// Jest configuration for the frontend (Next.js + TypeScript + React Testing Library)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Patterns Jest will use to find test files
  testMatch: [
    '<rootDir>/__tests__/**/*.(spec|test).(ts|tsx|js)',
    '<rootDir>/**/__tests__/**/*.(spec|test).(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)+(spec|test).(ts|tsx|js)'
  ],

  // File extensions Jest will process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Setup file to configure testing-library matchers & global mocks
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Transforms for TypeScript and JS files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Map static assets and CSS imports to mocks so tests don't break on import
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Ignore Next.js build output and node_modules
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],

  // Provide ts-jest a custom tsconfig if you want separate test settings (optional)
  globals: {
    'ts-jest': {
      // If you want a separate tsconfig for tests, create tsconfig.jest.json and set its path here.
      // tsconfig: 'tsconfig.jest.json'
    }
  },

  // Improve error messages for async tests
  detectOpenHandles: true,
};
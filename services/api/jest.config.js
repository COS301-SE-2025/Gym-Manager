/** jest.config.js */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  /* NEW – tell Jest where *source* lives */
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  /* NEW – your tests now live in organized sub-folders */
  roots: [
    '<rootDir>/src/tests/unit/repositories',
    '<rootDir>/src/tests/unit/controllers',
    '<rootDir>/src/tests/unit/services',
    '<rootDir>/src/tests/integration',
  ],

  /* Enhanced coverage configuration */
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/tests/', '/src/db/', '/src/infrastructure/'],
  collectCoverageFrom: [
    'src/repositories/**/*.ts',
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.entity.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts']
};

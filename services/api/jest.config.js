/** jest.config.js */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  /* NEW – tell Jest where *source* lives */
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  /* NEW – your tests now live in two sub-folders */
  roots: [
    '<rootDir>/src/tests/unit',
    '<rootDir>/src/tests/integration',
  ],

  /* leave coverage exactly as you had it */
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/tests/'],
};

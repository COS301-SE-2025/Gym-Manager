export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const moduleNameMapper = {
    '^@/(.*)$': '<rootDir>/src/$1',
};
export const testPathIgnorePatterns = ['/node_modules/', '/.next/'];
export const setupFilesAfterEnv = ['<rootDir>/jest.setup.ts'];
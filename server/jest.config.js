/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/**/*.js'],
  coverageDirectory: '<rootDir>/coverage',
};

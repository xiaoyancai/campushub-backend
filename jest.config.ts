import type { Config } from "jest";
const config: Config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.test.json" }],
  },
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  maxWorkers: 1,
  testTimeout: 60000,
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/controllers/**/*.ts",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "json-summary", "lcov", "html"],
  coverageThreshold: {
    global: { statements: 81, branches: 81 },
    "./src/services/": { statements: 81, branches: 81 },
    "./src/controllers/": { statements: 81, branches: 81 },
  },
};
export default config;

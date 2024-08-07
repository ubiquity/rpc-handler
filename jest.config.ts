import { JestConfigWithTsJest } from "ts-jest";

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./tests"],
  coveragePathIgnorePatterns: ["node_modules", "mocks"],
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover", "json-summary"],
  reporters: ["default", "jest-junit", "jest-md-dashboard"],
  coverageDirectory: "coverage",
} as JestConfigWithTsJest;

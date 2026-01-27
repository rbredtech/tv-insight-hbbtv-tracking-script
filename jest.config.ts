import type { Config } from "@jest/types";
import { createRequire } from "module";
import { pathsToModuleNameMapper } from "ts-jest";

const require = createRequire(import.meta.url);
const { compilerOptions } = require("./tsconfig.json");

const config: Config.InitialOptions = {
  moduleDirectories: ["<rootDir>", "<rootDir>/src", "node_modules"],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  preset: "jest-puppeteer",
  testRegex: "(\\.|/)(test|spec)\\.(js|ts)$",
  verbose: true,
  detectOpenHandles: true,
};

export default config;

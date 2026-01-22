import type { Config } from "@jest/types";
import { pathsToModuleNameMapper } from "ts-jest";

import { compilerOptions } from "./tsconfig.json";

const config: Config.InitialOptions = {
  moduleDirectories: ["<rootDir>", "<rootDir>/src", "node_modules"],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  preset: "jest-puppeteer",
  testRegex: "(\\.|/)(test|spec)\\.(js|ts)$",
  verbose: true,
  detectOpenHandles: true,
};

export default config;

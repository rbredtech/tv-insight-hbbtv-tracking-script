import type { Config } from "@jest/types";
import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

const config: Config.InitialOptions = {
    moduleDirectories: ["<rootDir>", "<rootDir>/src", "node_modules"],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    preset: "ts-jest",
    setupFiles: ["<rootDir>/test/setEnvVars.ts"],
    testEnvironment: "node",
    testRegex: "(\\.|/)(test|spec)\\.(js|ts)$",
    transform: {
        "^.+\\.[tj]s$": "ts-jest",
    },
};

export default config;

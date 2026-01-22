import { EnvVar } from "./../util/env.js";

export const NODE_ENV = new EnvVar("NODE_ENV").getString();
export const LOGGING_LEVEL = new EnvVar("LOGGING_LEVEL").getString();

export const SERVER_PORT = new EnvVar("SERVER_PORT").getStringOrDefault("3000");
export const USE_MINIFIED = new EnvVar("USE_MINIFIED").getBooleanOrDefault(false);

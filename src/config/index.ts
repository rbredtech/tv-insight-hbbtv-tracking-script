import { EnvVar } from "./../util/env";

export const NODE_ENV = new EnvVar("NODE_ENV").getString();
export const LOGGING_LEVEL = new EnvVar("LOGGING_LEVEL").getString();

export const SERVER_PORT = new EnvVar("SERVER_PORT").getStringOrDefault("3000");

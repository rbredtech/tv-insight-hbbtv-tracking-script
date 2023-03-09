import { createLogger, format, transports } from "winston";
import { LOGGING_LEVEL, NODE_ENV } from "@config";

const logger = createLogger({
  level: LOGGING_LEVEL,
  transports: [
    new transports.Console({
      format:
        NODE_ENV === "production"
          ? format.simple()
          : format.combine(
              format.colorize(),
              format.simple(),
              format.timestamp(),
              format.prettyPrint(),
              format.errors({ stack: true }),
            ),
      silent: NODE_ENV === "test",
    }),
  ],
});

export default logger;

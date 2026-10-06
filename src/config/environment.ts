export class ConfigurationError extends Error {}
export interface Environment {
  port: number;
  mongodbUri: string;
}
export function readEnvironment(): Environment {
  const port = Number(process.env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError("PORT must be an integer between 1 and 65535");
  }
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri?.trim())
    throw new ConfigurationError("MONGODB_URI is required");
  return { port, mongodbUri };
}

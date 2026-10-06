import { ConfigurationError } from "./environment.js";

// Only fixed messages and application-owned configuration errors reach logs.
// Never print driver messages, causes, stacks, or connection strings.
export function describeStartupError(error: unknown): string {
  if (error instanceof ConfigurationError) return error.message;
  if (typeof error !== "object" || error === null)
    return "Unexpected startup failure.";
  const code = "code" in error ? error.code : undefined;
  const name = "name" in error ? error.name : undefined;
  if (code === "EADDRINUSE") return "PORT is already in use.";
  if (code === "EACCES" || code === "EPERM")
    return "Permission denied while opening the server port.";
  if (code === 18 || code === "AuthenticationFailed")
    return "MongoDB authentication failed. Check database credentials.";
  if (name === "MongoParseError")
    return "Invalid MongoDB connection configuration. Check MONGODB_URI.";
  if (
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError"
  ) {
    return "MongoDB is unreachable. Check that it is running, plus network access and connection settings.";
  }
  return "Unexpected startup failure. Check server and database configuration.";
}

import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const simulateRaw = process.env.SIMULATE_LATENCY_MS;
const simulateLatencyMs =
  simulateRaw && simulateRaw.trim() !== ""
    ? Number(simulateRaw)
    : undefined;

if (simulateLatencyMs !== undefined && Number.isNaN(simulateLatencyMs)) {
  throw new Error("SIMULATE_LATENCY_MS must be a number when set");
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URL: required("MONGO_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  SIMULATE_LATENCY_MS: simulateLatencyMs,
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  MAX_CONCURRENT: z.coerce.number().default(5),
  DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  DEFAULT_MAX_TURNS: z.coerce.number().default(50),
  DEFAULT_MAX_BUDGET_USD: z.coerce.number().default(2.0),
  GLOBAL_BUDGET_CAP_USD: z.coerce.number().default(50.0),
  WEBHOOK_PORT: z.coerce.number().default(3000),
  API_PORT: z.coerce.number().default(3001),
  POLL_INTERVAL_MS: z.coerce.number().default(2000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(1800000),
  SCHEDULER_POLL_MS: z.coerce.number().default(60000),
  DB_PATH: z.string().default("./data/claude-claw.db"),
  LOG_LEVEL: z.string().default("info"),
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;

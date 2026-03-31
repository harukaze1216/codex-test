import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_REPO_OWNER: z.string().min(1),
  GITHUB_REPO_NAME: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  SENDGRID_API_KEY: z.string().default(""),
  NOTIFICATION_FROM_EMAIL: z.string().default("noreply@example.com"),
  SLACK_WEBHOOK_URL: z.string().default(""),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  return envSchema.parse(process.env);
}

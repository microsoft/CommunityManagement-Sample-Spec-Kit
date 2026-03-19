import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_CLIENT_ID: z.string().startsWith("ca_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXTAUTH_SECRET: z.string().min(1),
  ENTRA_CLIENT_ID: z.string().uuid(),
  ENTRA_TENANT_ID: z.string().uuid(),
  NEXTAUTH_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(", ")}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  return result.data;
}

let _env: Env | null = null;

export function env(): Env {
  if (!_env) {
    _env = loadEnv();
  }
  return _env;
}

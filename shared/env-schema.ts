import { z } from 'zod';

/**
 * Environment variables schema for server-side validation
 */
export const serverEnvSchema = z.object({
  // Database configuration
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Session security
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET should be at least 32 characters long"),
  
  // Email service configuration
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY is required"),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional().default("canchaplusapp@gmail.com"),
  
  // Server configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
  PORT: z.coerce.number().optional().transform(p =>
    typeof p === 'number' && !Number.isNaN(p) ? p : (process.env.PORT ? Number(process.env.PORT) : 5000)
  ),
});

/**
 * Type for server environment variables
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Environment variables schema for client-side validation
 * Only add variables here that are needed in the client and are public
 * (i.e., they don't contain secrets and are prefixed with VITE_)
 */
export const clientEnvSchema = z.object({
  // Public configuration variables for the client
  VITE_API_URL: z.string().url("VITE_API_URL must be a valid URL").optional(),
  VITE_APP_NAME: z.string().default("TeamKick"),
});

/**
 * Type for client environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validate server environment variables
 * @throws {Error} If validation fails
 */
export function validateServerEnv(): ServerEnv {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed. Please check your .env file.\n${missingFields}`);
    }
    throw error;
  }
}

/**
 * Validate client environment variables
 * @throws {Error} If validation fails
 */
export function validateClientEnv(): ClientEnv {
  try {
    // Filter env variables to only include those with VITE_ prefix
    const viteEnv = Object.fromEntries(
      Object.entries(import.meta.env).filter(([key]) => key.startsWith('VITE_'))
    );
    return clientEnvSchema.parse(viteEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Client environment validation failed.\n${missingFields}`);
    }
    throw error;
  }
}
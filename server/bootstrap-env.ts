import { z } from 'zod';
import dotenv from 'dotenv';

// Load dotenv as early as possible
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Database configuration (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Session security (required)
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET should be at least 32 characters long"),
  
  // Email service configuration (optional with warning)
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional().default("canchaplusapp@gmail.com"),
  
  // Server configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
  PORT: z.coerce.number().default(5000),
});

// Create a type from the schema
export type AppEnv = z.infer<typeof envSchema>;

// Validate and export environment
function validateEnv(): AppEnv {
  try {
    const env = envSchema.parse(process.env);
    
    // Log optional missing variables as warnings
    if (!env.SENDGRID_API_KEY) {
      console.warn("Warning: SENDGRID_API_KEY is not set. Email functionality will not work.");
    }
    
    if (!env.FRONTEND_URL) {
      console.warn("Warning: FRONTEND_URL is not set. Using relative URLs.");
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      console.error('\n==== CRITICAL ENVIRONMENT ERROR ====');
      console.error(formattedError);
      console.error('Please check your environment variables.');
      console.error('=====================================\n');
    } else {
      console.error('Unknown environment validation error:', error);
    }
    process.exit(1);
  }
}

export const env = validateEnv();
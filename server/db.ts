import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from './env';

neonConfig.webSocketConstructor = ws;

// DATABASE_URL is already validated in env.ts
export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

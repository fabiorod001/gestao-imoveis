import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Standard PostgreSQL connection for any provider
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
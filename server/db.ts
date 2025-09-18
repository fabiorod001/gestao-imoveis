import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// COMPLETELY INDEPENDENT PostgreSQL connection
// Works with ANY PostgreSQL database (local, AWS RDS, Google Cloud SQL, etc.)

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection pool configuration
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Add error handling for pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });
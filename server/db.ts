import dotenv from "dotenv-safe";

// Load environment variables first
dotenv.config({
  allowEmptyValues: true,
  example: "./.env.example",
});

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
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

export const db = drizzle(pool, { schema });
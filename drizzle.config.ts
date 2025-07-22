import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './data/gestao-imoveis.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;

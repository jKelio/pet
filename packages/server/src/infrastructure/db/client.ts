import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type DbClient = ReturnType<typeof createDbClient>;

export function createDbClient(databaseUrl: string): ReturnType<typeof drizzle<typeof schema>> {
  const sql = postgres(databaseUrl, { max: 10 });
  return drizzle(sql, { schema });
}

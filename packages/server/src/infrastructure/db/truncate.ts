import { createDbClient } from './client.js';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');

const db = createDbClient(DATABASE_URL);

await db.execute(sql`
  TRUNCATE drills, practice_sessions, memberships, teams, users, tenants
  RESTART IDENTITY CASCADE
`);

console.log('All tables truncated.');
process.exit(0);

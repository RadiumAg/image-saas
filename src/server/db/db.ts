// Make sure to install the 'postgres' package
// import { drizzle } from 'drizzle-orm/postgres-js';
// import postgres from 'postgres';
import * as schema from './schema';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// const queryClient = postgres(process.env.DATABASE_URL!);
// const db = drizzle(queryClient, { schema });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

export { db };

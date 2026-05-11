import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Did you create a .env file?');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  console.log(`Running ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  await client.query(sql);
}

await client.end();
console.log(`Done. Ran ${files.length} migration(s).`);

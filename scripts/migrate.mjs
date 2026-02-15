/**
 * Run the Supabase schema migration.
 * Uses the session pooler (port 5432) as the connection target —
 * the direct IPv6 host (db.[ref].supabase.co) is often unreachable.
 *
 * Usage:
 *   DB_DIRECT_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres" \
 *   node scripts/migrate.mjs
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const connectionString = process.env.DB_DIRECT_URL
if (!connectionString) {
  console.error('Error: DB_DIRECT_URL environment variable is required.')
  console.error('Format: postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres')
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const sql = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8')

await client.connect()
console.log('Connected.')

await client.query(sql)
console.log('Schema applied successfully.')

await client.end()

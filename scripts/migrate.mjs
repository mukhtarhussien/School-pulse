import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to apply the production database migrations before building.')
}

const sql = neon(databaseUrl)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'migrations')
const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
const baselineIncludedMigrations = [
  '20261009_user_preferences.sql',
  '20261015_role_registration_and_login_identifiers.sql',
  '20261022_username_minimum_length.sql',
  '20261119_multi_school_communities.sql',
]
const legacyTableNames = ['users', 'sessions', 'conversations', 'conversation_members', 'messages', 'message_images']

async function markApplied(name) {
  await sql.query('INSERT INTO public.school_pulse_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name])
}

await sql.query(`
  CREATE TABLE IF NOT EXISTS public.school_pulse_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`)

const [state] = await sql.query(`
  SELECT
    to_regclass('public.schools') IS NOT NULL AS has_schools,
    to_regclass('public.registration_requests') IS NOT NULL AS has_registrations,
    to_regclass('public.platform_diagnostics') IS NOT NULL AS has_diagnostics
`)

if (!state.has_schools || !state.has_registrations) {
  const tables = await sql.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
  const tableNames = tables.map(({ tablename }) => tablename)
  const unexpected = tableNames.filter((name) => name !== 'school_pulse_migrations' && !legacyTableNames.includes(name))
  if (unexpected.length) {
    throw new Error(`Refusing to initialize an incomplete database with unrecognized public tables: ${unexpected.join(', ')}`)
  }

  const hasLegacySchema = tableNames.some((name) => legacyTableNames.includes(name))
  if (hasLegacySchema) {
    await sql.query('CREATE SCHEMA IF NOT EXISTS legacy_archive')
    for (const name of legacyTableNames) {
      if (!tableNames.includes(name)) continue
      const [archived] = await sql.query('SELECT to_regclass($1) AS relation', [`legacy_archive.${name}`])
      if (archived?.relation) throw new Error(`Refusing to overwrite legacy_archive.${name}`)
      await sql.query(`ALTER TABLE public."${name}" SET SCHEMA legacy_archive`)
    }
    console.log('Archived legacy account and messaging tables in legacy_archive.')
  }

  const baseline = await readFile(path.join(root, 'drizzle', '0000_initial_school_pulse.sql'), 'utf8')
  for (const statement of baseline.split('--> statement-breakpoint').flatMap((part) => part.split(';')).map((part) => part.trim()).filter(Boolean)) {
    await sql.query(statement)
  }
  await sql.query("INSERT INTO public.schools (slug, name_ar, name_en) VALUES ('first-school', 'مدرستي الأولى', 'My First School') ON CONFLICT (slug) DO NOTHING")
  console.log('Applied the current School Pulse schema baseline.')
}

for (const name of baselineIncludedMigrations) await markApplied(name)

for (const name of migrationFiles) {
  const applied = await sql.query('SELECT 1 FROM public.school_pulse_migrations WHERE name = $1 LIMIT 1', [name])
  if (applied.length > 0) continue

  const contents = await readFile(path.join(migrationsDir, name), 'utf8')
  if (name === '20261119_multi_school_communities.sql') {
    throw new Error('The multi-school schema is part of the current baseline and cannot be replayed as a standalone migration.')
  }
  const statements = contents.split(';').map((statement) => statement.trim()).filter(Boolean)
  for (const statement of statements) await sql.query(statement)
  await markApplied(name)
  console.log(`Applied database migration: ${name}`)
}

if (!state.has_diagnostics) {
  const diagnosticsApplied = await sql.query('SELECT 1 FROM public.school_pulse_migrations WHERE name = $1 LIMIT 1', ['20261120_platform_diagnostics.sql'])
  if (diagnosticsApplied.length === 0) throw new Error('Platform diagnostics migration did not run.')
}

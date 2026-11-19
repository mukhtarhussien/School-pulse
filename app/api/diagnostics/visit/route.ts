import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { users } from '@/db/schema'
import { requireDb } from '@/db'
import { getCurrentUser } from '@/lib/auth'
import { hashDiagnosticIp, recordPlatformDiagnostic } from '@/lib/diagnostics'
import { getClientIp } from '@/lib/security'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return new NextResponse(null, { status: 403 })
  try {
    if (new URL(origin).host !== host) return new NextResponse(null, { status: 403 })
  } catch {
    return new NextResponse(null, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const path = body && typeof body === 'object' && 'path' in body ? (body as { path?: unknown }).path : null
  if (typeof path !== 'string' || path.length > 255 || !path.startsWith('/') || path.includes('?') || path.startsWith('/api/')) {
    return new NextResponse(null, { status: 400 })
  }

  const user = await getCurrentUser().catch(() => null)
  const ip = await getClientIp().catch(() => null)
  if (user) await requireDb().update(users).set({ lastSeenAt: sql`now()` }).where(and(eq(users.id, user.id), or(isNull(users.lastSeenAt), sql`${users.lastSeenAt} < now() - interval '5 minutes'`)))
  await recordPlatformDiagnostic({
    eventType: 'page_view',
    actorUserId: user?.id ?? null,
    actorRole: user?.role ?? null,
    route: path,
    method: 'GET',
    statusCode: 200,
    ipHash: await hashDiagnosticIp(ip),
  })
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

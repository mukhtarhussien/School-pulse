import 'server-only'
import { requireDb } from '@/db'
import { platformDiagnostics } from '@/db/schema'

export type PlatformDiagnosticInput = {
  eventType: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  actorUserId?: string | null
  actorRole?: string | null
  subjectUserId?: string | null
  route?: string | null
  method?: string | null
  statusCode?: number | null
  durationMs?: number | null
  errorCode?: string | null
  errorDigest?: string | null
  message?: string | null
  requestId?: string | null
  ipHash?: string | null
  metadata?: Record<string, unknown>
}

export async function hashDiagnosticIp(ip: string | null | undefined) {
  const secret = process.env.SESSION_SECRET
  if (!ip || !secret) return null
  try {
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signature = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`diagnostic-ip:${ip}`))
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export async function recordPlatformDiagnostic(event: PlatformDiagnosticInput) {
  try {
    await requireDb().insert(platformDiagnostics).values({
      eventType: event.eventType.slice(0, 48),
      severity: event.severity ?? 'info',
      actorUserId: event.actorUserId ?? null,
      actorRole: event.actorRole?.slice(0, 24) ?? null,
      subjectUserId: event.subjectUserId ?? null,
      route: event.route?.split('?')[0].slice(0, 255) ?? null,
      method: event.method?.slice(0, 10) ?? null,
      statusCode: event.statusCode ?? null,
      durationMs: event.durationMs ?? null,
      errorCode: event.errorCode?.slice(0, 64) ?? null,
      errorDigest: event.errorDigest?.slice(0, 128) ?? null,
      message: event.message?.slice(0, 500) ?? null,
      requestId: event.requestId?.slice(0, 128) ?? null,
      ipHash: event.ipHash ?? null,
      metadata: event.metadata ?? {},
    })
  } catch {
    // Diagnostics must never turn a failed request into another failed request.
    console.error('Could not persist platform diagnostic event:', event.eventType)
  }
}

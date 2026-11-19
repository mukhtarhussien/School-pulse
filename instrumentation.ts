import type { Instrumentation } from 'next'
import { hashDiagnosticIp, recordPlatformDiagnostic } from './lib/diagnostics'

function getErrorCode(error: unknown) {
  let current = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as { code?: unknown; cause?: unknown }
    if (typeof candidate.code === 'string' && /^[A-Z0-9_]{2,64}$/.test(candidate.code)) return candidate.code
    current = candidate.cause
  }
  return null
}

function getDigest(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) return null
  const digest = (error as { digest?: unknown }).digest
  return typeof digest === 'string' ? digest : null
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const errorCode = getErrorCode(error)
  const headers = request.headers
  const forwarded = headers['x-forwarded-for']
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const vercelId = headers['x-vercel-id']
  const requestId = Array.isArray(vercelId) ? vercelId[0] : vercelId
  await recordPlatformDiagnostic({
    eventType: errorCode?.startsWith('23') || errorCode?.startsWith('42') || errorCode?.startsWith('08') ? 'database_error' : 'server_error',
    severity: 'error',
    route: context.routePath || request.path.split('?')[0],
    method: request.method,
    statusCode: 500,
    errorCode,
    errorDigest: getDigest(error),
    message: errorCode ? 'Database request failed' : 'Server request failed',
    requestId,
    ipHash: hashDiagnosticIp(ip),
    metadata: {
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  })
}

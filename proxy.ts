import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Strict-Transport-Security': 'max-age=63072000',
}

const denied = (message: string, status = 403, headers: HeadersInit = securityHeaders) =>
  new NextResponse(message, { status, headers })

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return NextResponse.next()

  // Vercel supplies this header from the connection that reached its edge.
  // Fall back to the URL protocol for other reverse proxy deployments.
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    .trim()
    .toLowerCase()
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(/:$/, '').toLowerCase()

  if (protocol !== 'https') {
    return denied('HTTPS is required.', 403, { 'Cache-Control': 'no-store' })
  }

  const country = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase()
  if (country !== 'IQ') return denied('This school portal is available only in Iraq.')

  const response = NextResponse.next()
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value)
  }
  return response
}

export const config = {
  matcher: ['/:path*'],
}

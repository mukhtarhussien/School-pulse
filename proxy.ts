import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const denied = () => new NextResponse('This school portal is available only in Iraq.', {
  status: 403,
  headers: { 'Cache-Control': 'no-store' },
})

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return NextResponse.next()

  const country = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase()
  if (country !== 'IQ') return denied()

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

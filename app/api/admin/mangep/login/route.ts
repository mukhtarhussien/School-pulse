import { NextResponse } from 'next/server'
import { beginPlatformManagerGoogleOAuth, googleConfigured } from '@/lib/google'

export async function GET(request: Request) {
  if (!googleConfigured() || (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_REDIRECT_URI)) {
    return NextResponse.redirect(new URL('/admin/mangep?error=google_not_configured', request.url))
  }
  try {
    const url = await beginPlatformManagerGoogleOAuth(new URL(request.url).origin)
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.redirect(new URL('/admin/mangep?error=google_not_configured', request.url))
  }
}

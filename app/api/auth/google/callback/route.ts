import { NextResponse } from 'next/server'
import { exchangeGoogleCode, fetchGoogleProfile, readGoogleOAuthState, resolveGoogleLogin, setAdminGoogleLoginIdentity, consumePlatformManagerGoogleFlow } from '@/lib/google'
import { createSession } from '@/lib/auth'
import { requireDb } from '@/db'
import { users } from '@/db/schema'
import { eq, ilike } from 'drizzle-orm'
import { PLATFORM_MANAGER_EMAIL } from '@/lib/platform-manager'
import { isRequestFlooded } from '@/lib/security'


export async function GET(request: Request) {
  const url = new URL(request.url)
  const platformManagerFlow = await consumePlatformManagerGoogleFlow()
  const state = await readGoogleOAuthState()
  const role = state?.requestedRole || 'student'
  const failureUrl = (error: string) => new URL(platformManagerFlow ? `/admin/mangep?error=${error}` : `/login?error=${error}&role=${role}`, request.url)
  if (url.searchParams.get('error')) return NextResponse.redirect(failureUrl('google_cancelled'))
  if (!state || state.state !== url.searchParams.get('state')) return NextResponse.redirect(failureUrl('google_state'))
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(failureUrl('google_code'))
  const tokens = await exchangeGoogleCode(code, state.verifier, url.origin)
  if (!tokens?.access_token) return NextResponse.redirect(failureUrl('google_token'))
  const profile = await fetchGoogleProfile(tokens.access_token)
  if (!profile) return NextResponse.redirect(failureUrl('google_profile'))
  const profileFlood = await isRequestFlooded([['google', profile.sub], ['email', profile.email]])
  if (profileFlood.blocked) return NextResponse.redirect(failureUrl('rate_limited'))

  if (platformManagerFlow) {
    if (state.requestedRole !== 'admin' || profile.email.trim().toLowerCase() !== PLATFORM_MANAGER_EMAIL) {
      return NextResponse.redirect(failureUrl('manager_forbidden'))
    }
    const db = requireDb()
    let [account] = await db.select({ id: users.id, email: users.email, googleSubject: users.googleSubject, isActive: users.isActive, role: users.role }).from(users).where(ilike(users.email, PLATFORM_MANAGER_EMAIL)).limit(1)
    if (!account) {
      const displayName = profile.name?.trim().slice(0, 160) || 'Platform Manager'
      const [created] = await db.insert(users).values({
        email: PLATFORM_MANAGER_EMAIL,
        fullNameAr: 'مدير المنصة',
        fullNameEn: displayName,
        googleSubject: profile.sub,
        role: 'admin',
        isActive: true,
      }).onConflictDoNothing({ target: users.email }).returning({ id: users.id, email: users.email, googleSubject: users.googleSubject, isActive: users.isActive, role: users.role })
      account = created ?? (await db.select({ id: users.id, email: users.email, googleSubject: users.googleSubject, isActive: users.isActive, role: users.role }).from(users).where(ilike(users.email, PLATFORM_MANAGER_EMAIL)).limit(1))[0]
    }
    if (!account || !account.isActive || account.role !== 'admin' || account.email.trim().toLowerCase() !== PLATFORM_MANAGER_EMAIL || (account.googleSubject && account.googleSubject !== profile.sub)) {
      return NextResponse.redirect(failureUrl('manager_forbidden'))
    }
    if (!account.googleSubject) await db.update(users).set({ googleSubject: profile.sub, updatedAt: new Date() }).where(eq(users.id, account.id))
    await createSession(account.id, 'google')
    return NextResponse.redirect(new URL('/admin/mangep', request.url))
  }
  const result = await resolveGoogleLogin(profile, state.requestedRole)
  if (result.kind === 'signed-in') return NextResponse.redirect(new URL('/', request.url))
  if (result.kind === 'admin-password') {
    await setAdminGoogleLoginIdentity({ userId: result.userId, email: profile.email, googleSubject: profile.sub })
    return NextResponse.redirect(new URL('/login?role=admin&google=verified', request.url))
  }
  if (result.kind === 'inactive') return NextResponse.redirect(new URL(`/login?error=account_inactive&role=${state.requestedRole}`, request.url))
  if (result.kind === 'wrong-role') return NextResponse.redirect(new URL(`/login?error=google_wrong_role&role=${state.requestedRole}`, request.url))
  return NextResponse.redirect(new URL(`/register?method=google&role=${result.role === 'teacher' ? 'teacher' : 'student'}`, request.url))
}

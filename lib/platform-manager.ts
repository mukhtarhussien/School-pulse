import 'server-only'
import { getCurrentSession } from '@/lib/auth'

export const PLATFORM_MANAGER_EMAIL = 'za.smoke55@gmail.com'

export async function getPlatformManagerSession() {
  const session = await getCurrentSession()
  if (!session || session.authMethod !== 'google') return null
  if (session.user.role !== 'admin' || !session.user.isActive) return null
  if (session.user.email.trim().toLowerCase() !== PLATFORM_MANAGER_EMAIL) return null
  return session
}

export async function requirePlatformManager() {
  const session = await getPlatformManagerSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session.user
}

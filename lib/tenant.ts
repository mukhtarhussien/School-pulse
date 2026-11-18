import 'server-only'

import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireDb } from '@/db'
import { schools, type User } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'

export type SchoolUser = User & { schoolId: string }
export type SchoolManager = { user: User; schoolId: string; platformWide: boolean }

export function isSocialEnabled(user: Pick<User, 'preferences'>) {
  return user.preferences?.socialEnabled !== false
}

export function socialMessageAudience(user: Pick<User, 'preferences'>): 'contacts' | 'school' | 'platform' {
  const value = user.preferences?.socialMessageAudience
  return value === 'contacts' || value === 'school' ? value : 'platform'
}

export async function requireSchoolUser(roles: Array<'student' | 'teacher' | 'school_admin'> = ['student', 'teacher']) {
  const user = await getCurrentUser()
  if (!user || !user.isActive || !user.schoolId || !roles.includes(user.role as 'student' | 'teacher' | 'school_admin')) redirect('/login')
  const [school] = await requireDb().select({ id: schools.id }).from(schools)
    .where(and(eq(schools.id, user.schoolId), eq(schools.isActive, true))).limit(1)
  if (!school) redirect('/login?error=school_inactive')
  return user as SchoolUser
}

export async function requireSchoolManager(requestedSchoolId?: string): Promise<SchoolManager> {
  const user = await getCurrentUser()
  if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'school_admin')) redirect('/login')
  if (user.role === 'school_admin') {
    if (!user.schoolId || (requestedSchoolId && requestedSchoolId !== user.schoolId)) redirect('/login?error=forbidden')
    return { user, schoolId: user.schoolId, platformWide: false }
  }
  const database = requireDb()
  const [school] = requestedSchoolId
    ? await database.select({ id: schools.id }).from(schools).where(eq(schools.id, requestedSchoolId)).limit(1)
    : await database.select({ id: schools.id }).from(schools).orderBy(schools.createdAt).limit(1)
  if (!school) throw new Error('SCHOOL_NOT_FOUND')
  return { user, schoolId: school.id, platformWide: true }
}

export function isSameSchool(left: Pick<User, 'schoolId'>, right: Pick<User, 'schoolId'>) {
  return Boolean(left.schoolId && right.schoolId && left.schoolId === right.schoolId)
}

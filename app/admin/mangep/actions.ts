'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireDb } from '@/db'
import { platformReports, schools, sessions, users } from '@/db/schema'
import { hashPassword } from '@/lib/auth'
import { PLATFORM_MANAGER_EMAIL, requirePlatformManager } from '@/lib/platform-manager'

const path = '/admin/mangep'
const value = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
const refresh = () => revalidatePath(path)
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

export async function createSchoolAction(fd: FormData) {
  await requirePlatformManager()
  const slug = value(fd, 'slug').toLowerCase(), nameAr = value(fd, 'nameAr'), nameEn = value(fd, 'nameEn')
  if (!/^[a-z0-9-]{2,100}$/.test(slug) || !nameAr || !nameEn) throw new Error('INVALID_SCHOOL')
  await requireDb().insert(schools).values({ slug, nameAr: nameAr.slice(0, 180), nameEn: nameEn.slice(0, 180) })
  refresh()
}

export async function updateSchoolAction(fd: FormData) {
  await requirePlatformManager()
  const id = value(fd, 'id'), slug = value(fd, 'slug').toLowerCase(), nameAr = value(fd, 'nameAr'), nameEn = value(fd, 'nameEn')
  if (!validId(id) || !/^[a-z0-9-]{2,100}$/.test(slug) || !nameAr || !nameEn) throw new Error('INVALID_SCHOOL')
  await requireDb().update(schools).set({ slug, nameAr: nameAr.slice(0, 180), nameEn: nameEn.slice(0, 180), updatedAt: new Date() }).where(eq(schools.id, id))
  refresh()
}

export async function toggleSchoolAction(fd: FormData) {
  await requirePlatformManager()
  const id = value(fd, 'id'), active = value(fd, 'active') === 'true'
  if (!validId(id)) throw new Error('INVALID_SCHOOL')
  await requireDb().update(schools).set({ isActive: !active, updatedAt: new Date() }).where(eq(schools.id, id))
  refresh()
}

export async function deleteSchoolAction(fd: FormData) {
  await requirePlatformManager()
  const id = value(fd, 'id'), confirmSlug = value(fd, 'confirmSlug').toLowerCase()
  if (!validId(id)) throw new Error('INVALID_SCHOOL')
  const [school] = await requireDb().select({ slug: schools.slug }).from(schools).where(eq(schools.id, id)).limit(1)
  if (!school || school.slug !== confirmSlug) throw new Error('SCHOOL_DELETE_CONFIRMATION_REQUIRED')
  await requireDb().delete(schools).where(eq(schools.id, id))
  refresh()
}

export async function createUserAction(fd: FormData) {
  await requirePlatformManager()
  const email = value(fd, 'email').toLowerCase(), nameAr = value(fd, 'nameAr'), nameEn = value(fd, 'nameEn')
  const password = String(fd.get('password') ?? ''), role = value(fd, 'role'), schoolId = value(fd, 'schoolId') || null
  if (!/^\S+@\S+\.\S+$/.test(email) || !nameAr || !nameEn || password.length < 12 || !['student', 'teacher', 'school_admin', 'admin'].includes(role) || (schoolId && !validId(schoolId))) throw new Error('INVALID_USER')
  await requireDb().insert(users).values({ email, fullNameAr: nameAr.slice(0, 160), fullNameEn: nameEn.slice(0, 160), role: role as 'student' | 'teacher' | 'school_admin' | 'admin', schoolId, passwordHash: hashPassword(password) })
  refresh()
}

export async function updateUserAction(fd: FormData) {
  const manager = await requirePlatformManager()
  const id = value(fd, 'id'), email = value(fd, 'email').toLowerCase(), nameAr = value(fd, 'nameAr'), nameEn = value(fd, 'nameEn')
  const role = value(fd, 'role'), schoolId = value(fd, 'schoolId') || null
  if (!validId(id) || !/^\S+@\S+\.\S+$/.test(email) || !nameAr || !nameEn || !['student', 'teacher', 'school_admin', 'admin'].includes(role) || (schoolId && !validId(schoolId))) throw new Error('INVALID_USER')
  const db = requireDb(), [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1)
  if (!target || id === manager.id || target.email.trim().toLowerCase() === PLATFORM_MANAGER_EMAIL || email === PLATFORM_MANAGER_EMAIL) throw new Error('PROTECTED_USER')
  await db.update(users).set({ email, fullNameAr: nameAr.slice(0, 160), fullNameEn: nameEn.slice(0, 160), role: role as 'student' | 'teacher' | 'school_admin' | 'admin', schoolId, updatedAt: new Date() }).where(eq(users.id, id))
  refresh()
}

export async function toggleUserAction(fd: FormData) {
  const manager = await requirePlatformManager(), id = value(fd, 'id'), active = value(fd, 'active') === 'true'
  if (!validId(id) || id === manager.id) throw new Error('PROTECTED_USER')
  const db = requireDb(), [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1)
  if (!target || target.email.trim().toLowerCase() === PLATFORM_MANAGER_EMAIL) throw new Error('PROTECTED_USER')
  await db.update(users).set({ isActive: !active, updatedAt: new Date() }).where(eq(users.id, id))
  if (active) await db.delete(sessions).where(eq(sessions.userId, id))
  refresh()
}

export async function deleteUserAction(fd: FormData) {
  const manager = await requirePlatformManager()
  const id = value(fd, 'id'), confirmation = value(fd, 'confirmEmail').toLowerCase()
  if (!validId(id) || id === manager.id) throw new Error('PROTECTED_USER')
  const db = requireDb(), [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1)
  if (!target || target.email.trim().toLowerCase() === PLATFORM_MANAGER_EMAIL || target.email.trim().toLowerCase() !== confirmation) throw new Error('USER_DELETE_CONFIRMATION_REQUIRED')
  await db.delete(users).where(eq(users.id, id))
  refresh()
}

export async function updateReportAction(fd: FormData) {
  await requirePlatformManager()
  const id = value(fd, 'id'), status = value(fd, 'status')
  if (!validId(id) || !['open', 'reviewing', 'resolved'].includes(status)) throw new Error('INVALID_REPORT')
  await requireDb().update(platformReports).set({ status, updatedAt: new Date() }).where(eq(platformReports.id, id))
  refresh()
}

export async function deleteReportAction(fd: FormData) {
  await requirePlatformManager()
  const id = value(fd, 'id')
  if (!validId(id)) throw new Error('INVALID_REPORT')
  await requireDb().delete(platformReports).where(eq(platformReports.id, id))
  refresh()
}

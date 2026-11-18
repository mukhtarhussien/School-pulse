import 'server-only'

import crypto from 'node:crypto'
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { requireDb } from '@/db'
import { schools, schoolInvites } from '@/db/schema'

export type InviteRole = 'student' | 'teacher' | 'school_admin'
export type InviteDetails = { id: string; schoolId: string; schoolAr: string; schoolEn: string; role: InviteRole }

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function hashInviteCode(value: string) {
  return crypto.createHash('sha256').update(normalizeInviteCode(value)).digest('hex')
}

export async function inspectInvite(value: string, expectedRole?: InviteRole): Promise<InviteDetails | null> {
  const code = normalizeInviteCode(value)
  if (!/^[A-Z0-9]{10,20}$/.test(code)) return null
  const now = new Date()
  const rows = await requireDb().select({ invite: schoolInvites, school: schools })
    .from(schoolInvites)
    .innerJoin(schools, eq(schools.id, schoolInvites.schoolId))
    .where(and(
      eq(schoolInvites.codeHash, hashInviteCode(code)),
      isNull(schoolInvites.revokedAt),
      gt(schoolInvites.expiresAt, now),
      lt(schoolInvites.uses, schoolInvites.maxUses),
      eq(schools.isActive, true),
    )).limit(1)
  const row = rows[0]
  if (!row || (expectedRole && row.invite.role !== expectedRole)) return null
  return { id: row.invite.id, schoolId: row.school.id, schoolAr: row.school.nameAr, schoolEn: row.school.nameEn, role: row.invite.role as InviteRole }
}

export async function consumeInvite(inviteId: string) {
  const [updated] = await requireDb().update(schoolInvites)
    .set({ uses: sql`${schoolInvites.uses} + 1`, updatedAt: new Date() })
    .where(and(
      eq(schoolInvites.id, inviteId),
      isNull(schoolInvites.revokedAt),
      gt(schoolInvites.expiresAt, new Date()),
      lt(schoolInvites.uses, schoolInvites.maxUses),
    ))
    .returning({ id: schoolInvites.id })
  return Boolean(updated)
}

export function createRawInviteCode() {
  return crypto.randomBytes(9).toString('hex').toUpperCase()
}

export function isInviteRole(value: unknown): value is InviteRole {
  return value === 'student' || value === 'teacher' || value === 'school_admin'
}

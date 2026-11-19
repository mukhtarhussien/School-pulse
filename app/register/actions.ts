'use server'

import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { and, eq, or, type SQL } from 'drizzle-orm'
import { requireDb } from '@/db'
import { classes, notifications, registrationRequests, subjects, users } from '@/db/schema'
import { getRegistrationContext } from '@/lib/google'
import { hashPassword } from '@/lib/auth'
import { getClientIp, isRequestFlooded, isValidIraqiPhone, isValidTripleName, normalizeFullName, normalizePhone } from '@/lib/security'
import { consumeInvite, inspectInvite } from '@/lib/invitations'
import { recordPlatformDiagnostic } from '@/lib/diagnostics'

const value = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

function validBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date <= new Date()
}

export async function submitRegistrationAction(fd: FormData) {
  const request = await getRegistrationContext()
  if (!request) redirect('/login?error=registration_expired')
  if (request.status !== 'draft') redirect('/register')

  const fullName = normalizeFullName(value(fd, 'fullName'))
  const birthDate = value(fd, 'birthDate')
  const phone = normalizePhone(value(fd, 'phone'))
  const rawUsername = value(fd, 'username').toLowerCase()
  const classId = value(fd, 'classId')
  const subjectId = value(fd, 'subjectId')
  const inviteCode = value(fd, 'inviteCode')
  const requestedRole = request.requestedRole === 'teacher' ? 'teacher' : 'student'
  const registrationError = (reason: string) => redirect(`/register?method=google&role=${requestedRole}&error=${reason}&invite=${encodeURIComponent(inviteCode)}`)
  const invite = await inspectInvite(inviteCode, requestedRole)
  if (!invite) redirect(`/register?method=google&role=${requestedRole}&error=invite&invite=${encodeURIComponent(inviteCode)}`)

  const flood = await isRequestFlooded([
    ['google', request.googleSubject],
    ['email', request.email],
    ['phone', phone],
    ['registration-ip', await getClientIp()],
  ])
  if (flood.blocked) registrationError('rate_limited')
  if (!isValidTripleName(fullName)) registrationError('name')
  if (requestedRole === 'student' && !validBirthDate(birthDate)) registrationError('birth_date')
  if (!isValidIraqiPhone(phone)) registrationError('phone')
  if (rawUsername && !/^[a-z0-9._-]{5,32}$/.test(rawUsername)) registrationError('username')

  const database = requireDb()
  if (requestedRole === 'teacher') {
    const [subject] = await database.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, invite.schoolId))).limit(1)
    if (!subject) registrationError('subject')
  } else {
    const [classRow] = await database.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, invite.schoolId))).limit(1)
    if (!classRow) registrationError('class')
  }

  const [existingPhone] = await database.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1)
  if (existingPhone) registrationError('phone_taken')
  if (rawUsername) {
    const [existingUsername] = await database.select({ id: users.id }).from(users).where(eq(users.username, rawUsername)).limit(1)
    if (existingUsername) registrationError('username_taken')
    const [pendingUsername] = await database.select({ id: registrationRequests.id }).from(registrationRequests)
      .where(and(eq(registrationRequests.username, rawUsername), eq(registrationRequests.status, 'pending'))).limit(1)
    if (pendingUsername) registrationError('username_taken')
  }
  const [duplicatePhone] = await database.select({ id: registrationRequests.id }).from(registrationRequests)
    .where(and(eq(registrationRequests.phone, phone), eq(registrationRequests.status, 'pending'))).limit(1)
  if (duplicatePhone) registrationError('phone_pending')

  if (!await consumeInvite(invite.id)) registrationError('invite')
  await database.update(registrationRequests).set({
    schoolId: invite.schoolId,
    inviteId: invite.id,
    requestedRole,
    username: rawUsername || null,
    fullName,
    birthDate: requestedRole === 'student' ? birthDate : null,
    phone,
    classId: requestedRole === 'student' ? classId : null,
    subjectId: requestedRole === 'teacher' ? subjectId : null,
    status: 'pending',
    updatedAt: new Date(),
    rejectionReason: null,
  }).where(eq(registrationRequests.id, request.id))
  await recordPlatformDiagnostic({ eventType: 'registration_submitted', actorRole: requestedRole, route: '/register', statusCode: 202, metadata: { registrationRequestId: request.id } })

  const admins = await database.select({ id: users.id }).from(users).where(and(eq(users.isActive, true), or(eq(users.role, 'admin'), and(eq(users.role, 'school_admin'), eq(users.schoolId, invite.schoolId)))))
  if (admins.length) {
    const teacher = requestedRole === 'teacher'
    await database.insert(notifications).values(admins.map(admin => ({
      userId: admin.id,
      schoolId: invite.schoolId,
      titleAr: teacher ? 'طلب تسجيل مدرس جديد' : 'طلب تسجيل طالب جديد',
      titleEn: teacher ? 'New teacher registration request' : 'New student registration request',
      bodyAr: `${fullName} أرسل طلب تسجيل. الهاتف: ${phone}`,
      bodyEn: `${fullName} submitted a registration request. Phone: ${phone}`,
    })))
  }

  redirect(`/register?role=${requestedRole}&submitted=1`)
}

export async function submitPasswordRegistrationAction(fd: FormData) {
  const rawRole = value(fd, 'requestedRole')
  // Public registration is limited to student and teacher accounts. Admins are provisioned separately.
  const role: 'student' | 'teacher' | 'school_admin' = rawRole === 'teacher' ? 'teacher' : rawRole === 'school_admin' ? 'school_admin' : 'student'
  const roleQuery = `method=password&role=${role}`
  const fullName = normalizeFullName(value(fd, 'fullName'))
  const birthDate = value(fd, 'birthDate')
  const classId = value(fd, 'classId')
  const subjectId = value(fd, 'subjectId')
  const inviteCode = value(fd, 'inviteCode')
  const rawUsername = value(fd, 'username').toLowerCase()
  const email = value(fd, 'email').toLowerCase()
  const rawPhone = value(fd, 'phone')
  const phone = rawPhone ? normalizePhone(rawPhone) : ''
  const password = String(fd.get('password') ?? '')
  const passwordConfirm = String(fd.get('passwordConfirm') ?? '')

  const invite = await inspectInvite(inviteCode, role)
  if (!invite) redirect(`/register?${roleQuery}&error=invite`)
  if (!isValidTripleName(fullName)) redirect(`/register?${roleQuery}&error=name`)
  if (role === 'student' && !validBirthDate(birthDate)) redirect(`/register?${roleQuery}&error=birth_date`)
  if (role === 'student' && !classId) redirect(`/register?${roleQuery}&error=class`)
  if (role === 'teacher' && !subjectId) redirect(`/register?${roleQuery}&error=subject`)
  if (role === 'school_admin' && !email) redirect(`/register?${roleQuery}&error=email_required`)
  if (!rawUsername && !email && !phone) redirect(`/register?${roleQuery}&error=identifier`)
  if (rawUsername && !/^[a-z0-9._-]{5,32}$/.test(rawUsername)) redirect(`/register?${roleQuery}&error=username`)
  if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) redirect(`/register?${roleQuery}&error=email`)
  if (role === 'teacher' && !phone) redirect(`/register?${roleQuery}&error=phone`)
  if (phone && !isValidIraqiPhone(phone)) redirect(`/register?${roleQuery}&error=phone`)
  if (password.length < 8 || !/[A-Za-z\p{L}]/u.test(password) || !/\d/.test(password)) redirect(`/register?${roleQuery}&error=password`)
  if (password !== passwordConfirm) redirect(`/register?${roleQuery}&error=password_mismatch`)

  const database = requireDb()
  if (role === 'student') {
    const [classRow] = await database.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, invite.schoolId))).limit(1)
    if (!classRow) redirect(`/register?${roleQuery}&error=class`)
  }
  if (role === 'teacher') {
    const [subjectRow] = await database.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, invite.schoolId))).limit(1)
    if (!subjectRow) redirect(`/register?${roleQuery}&error=subject`)
  }

  const ip = await getClientIp()
  const flood = await isRequestFlooded([
    [`${role}-register-ip`, ip],
    [`${role}-register-email`, email],
    [`${role}-register-username`, rawUsername],
    [`${role}-register-phone`, phone],
  ])
  if (flood.blocked) redirect(`/register?${roleQuery}&error=rate_limited`)

  const loginEmail = email || `registration-${crypto.randomUUID()}@school-pulse.invalid`
  const userConditions: SQL[] = [eq(users.email, loginEmail)]
  if (rawUsername) userConditions.push(eq(users.username, rawUsername))
  if (phone) userConditions.push(eq(users.phone, phone))
  const [existingUser] = await database.select({ id: users.id }).from(users).where(or(...userConditions)).limit(1)
  if (existingUser) {
    if (email) redirect(`/register?${roleQuery}&error=email_taken`)
    if (rawUsername) redirect(`/register?${roleQuery}&error=username_taken`)
    redirect(`/register?${roleQuery}&error=phone_taken`)
  }

  const requestConditions: SQL[] = []
  if (email) requestConditions.push(eq(registrationRequests.email, email))
  if (rawUsername) requestConditions.push(eq(registrationRequests.username, rawUsername))
  if (phone) requestConditions.push(eq(registrationRequests.phone, phone))
  const [duplicate] = await database.select({ id: registrationRequests.id }).from(registrationRequests)
    .where(and(eq(registrationRequests.status, 'pending'), or(...requestConditions))).limit(1)
  if (duplicate) {
    if (email) redirect(`/register?${roleQuery}&error=email_taken`)
    if (rawUsername) redirect(`/register?${roleQuery}&error=username_taken`)
    redirect(`/register?${roleQuery}&error=phone_pending`)
  }

  if (!await consumeInvite(invite.id)) redirect(`/register?${roleQuery}&error=invite`)

  await database.insert(registrationRequests).values({
    schoolId: invite.schoolId,
    inviteId: invite.id,
    googleSubject: null,
    email: loginEmail,
    username: rawUsername || null,
    passwordHash: hashPassword(password),
    requestedRole: role,
    fullName,
    birthDate: birthDate || null,
    phone: phone || null,
    classId: role === 'student' ? classId : null,
    subjectId: role === 'teacher' ? subjectId : null,
    status: 'pending',
  })

  const admins = await database.select({ id: users.id }).from(users).where(and(eq(users.isActive, true), or(eq(users.role, 'admin'), and(eq(users.role, 'school_admin'), eq(users.schoolId, invite.schoolId)))))
  if (admins.length) {
    const label = role === 'teacher' ? 'مدرس' : 'طالب'
    const labelEn = role === 'teacher' ? 'teacher' : 'student'
    await database.insert(notifications).values(admins.map(admin => ({
      userId: admin.id,
      schoolId: invite.schoolId,
      titleAr: `طلب حساب ${label} جديد`,
      titleEn: `New ${labelEn} account request`,
      bodyAr: `${fullName} أرسل طلبًا لإنشاء حساب ${label}.`,
      bodyEn: `${fullName} submitted a ${labelEn} account request.`,
    })))
  }

  redirect(`/register?${roleQuery}&submitted=1`)
}

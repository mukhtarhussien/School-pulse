import Link from 'next/link'
import { and, desc, eq, gt, inArray, or, sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { requireDb } from '@/db'
import { announcements, assignments, attendanceRecords, calendarEvents, grades, assessments } from '@/db/schema'
import { BookOpen, CalendarDays, ClipboardList, Megaphone } from 'lucide-react'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) return null
  const db = requireDb()
  const audienceForRole = user.role === 'student' ? 'students' : user.role === 'teacher' ? 'teachers' : 'admins'
  const classAudience = user.classId ? and(eq(announcements.audience, 'class'), eq(announcements.classId, user.classId)) : sql`false`
  const [gradeRows, assignmentRows, attendanceRows, notices, events] = await Promise.all([
    user.role === 'student' ? db.select({ score: grades.score, maxScore: assessments.maxScore }).from(grades).innerJoin(assessments, eq(assessments.id, grades.assessmentId)).where(and(eq(grades.studentId, user.id), eq(assessments.published, true))).limit(300) : Promise.resolve([]),
    user.role === 'student' && user.classId ? db.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.classId, user.classId), eq(assignments.published, true), ...(user.schoolId ? [eq(assignments.schoolId, user.schoolId)] : []), gt(assignments.dueAt, new Date()))).limit(100) : Promise.resolve([]),
    user.role === 'student' ? db.select({ id: attendanceRecords.id }).from(attendanceRecords).where(eq(attendanceRecords.studentId, user.id)).limit(300) : Promise.resolve([]),
    user.schoolId ? db.select({ id: announcements.id, title: announcements.titleAr, body: announcements.bodyAr, date: announcements.publishedAt }).from(announcements).where(and(eq(announcements.schoolId, user.schoolId), eq(announcements.published, true), or(inArray(announcements.audience, ['all', audienceForRole]), classAudience))).orderBy(desc(announcements.publishedAt)).limit(5) : Promise.resolve([]),
    user.schoolId ? db.select({ id: calendarEvents.id, title: calendarEvents.titleAr, startsAt: calendarEvents.startsAt, location: calendarEvents.location }).from(calendarEvents).where(and(eq(calendarEvents.schoolId, user.schoolId), gt(calendarEvents.startsAt, new Date()), or(sql`${calendarEvents.classId} is null`, user.classId ? eq(calendarEvents.classId, user.classId) : sql`false`))).orderBy(calendarEvents.startsAt).limit(5) : Promise.resolve([]),
  ])
  const average = gradeRows.length ? Math.round(gradeRows.reduce((sum, row) => sum + (row.maxScore ? row.score / row.maxScore * 100 : 0), 0) / gradeRows.length) : null
  const metrics = [
    { title: 'المعدل المنشور', value: average === null ? '—' : `${average}%`, icon: BookOpen, href: '/grades' },
    { title: 'واجبات قادمة', value: String(assignmentRows.length), icon: ClipboardList, href: '/assignments' },
    { title: 'سجلات الحضور', value: String(attendanceRows.length), icon: CalendarDays, href: '/attendance' },
  ]
  return <div className="official-dashboard" dir="rtl">
    {user.role === 'student' && <section className="official-metrics">{metrics.map(({ title, value, icon: Icon, href }) => <Link href={href} className="official-metric panel" key={title}><Icon size={20}/><span>{title}</span><strong>{value}</strong></Link>)}</section>}
    <div className="official-columns"><section className="panel official-list"><header><Megaphone size={18}/><h2>إعلانات المدرسة</h2></header>{notices.length ? notices.map(item => <article key={item.id}><h3>{item.title}</h3><p>{item.body}</p>{item.date && <time>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium' }).format(item.date)}</time>}</article>) : <p className="official-empty">لا توجد إعلانات منشورة حاليًا.</p>}</section>
    <section className="panel official-list"><header><CalendarDays size={18}/><h2>المواعيد القادمة</h2></header>{events.length ? events.map(item => <article key={item.id}><h3>{item.title}</h3><p>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'full', timeStyle: 'short' }).format(item.startsAt)}</p>{item.location && <small>{item.location}</small>}</article>) : <p className="official-empty">لا توجد مواعيد قادمة مسجلة.</p>}</section></div>
  </div>
}

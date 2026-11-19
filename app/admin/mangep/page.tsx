import { desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireDb } from '@/db'
import { platformReports, schools, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { getPlatformManagerSession, PLATFORM_MANAGER_EMAIL } from '@/lib/platform-manager'
import {
  createSchoolAction, updateSchoolAction, toggleSchoolAction, deleteSchoolAction,
  createUserAction, updateUserAction, toggleUserAction, deleteUserAction, updateReportAction, deleteReportAction,
} from './actions'

export const metadata = { title: 'إدارة المنصة' }

const roleLabel: Record<string, string> = { student: 'طالب', teacher: 'مدرس', school_admin: 'إدارة مدرسة', admin: 'مدير منصة' }
const statusLabel: Record<string, string> = { open: 'جديد', reviewing: 'قيد المتابعة', resolved: 'تم الحل' }
const categoryLabel: Record<string, string> = { bug: 'خلل', abuse: 'إساءة', suggestion: 'اقتراح', other: 'أخرى' }

export default async function PlatformManagementPage({ searchParams }: PageProps<'/admin/mangep'>) {
  const query = await searchParams
  const session = await getPlatformManagerSession()
  if (!session) {
    const current = await getCurrentUser()
    return <main className="platform-manager-gate" dir="rtl">
      <div className="pm-gate-card"><span className="pm-mark">م</span><p className="pm-eyebrow">إدارة المنصة</p>
        <h1>{current ? 'هذا الحساب غير مخوّل' : 'دخول مدير المنصة'}</h1>
        <p>تسجيل الدخول متاح عبر Google للحساب الإداري المحدد.</p>
        {current && <p className="pm-account">الحساب الحالي: {current.email}</p>}
        {query.error === 'manager_forbidden' && <p className="pm-error">الدخول مرفوض لهذا الحساب. اختر حساب Google المصرح.</p>}
        {query.error === 'google_not_configured' && <p className="pm-error">تسجيل Google غير مهيأ. راجع إعدادات GOOGLE_CLIENT_ID وGOOGLE_CLIENT_SECRET.</p>}
        <a className="pm-primary" href="/api/admin/mangep/login">المتابعة باستخدام Google</a>
        <small>المسموح: {PLATFORM_MANAGER_EMAIL}</small>
      </div>
    </main>
  }

  const db = requireDb()
  const [schoolRows, userRows, reportRows, totals] = await Promise.all([
    db.select().from(schools).orderBy(desc(schools.createdAt)).limit(300),
    db.select({ id: users.id, email: users.email, fullNameAr: users.fullNameAr, fullNameEn: users.fullNameEn, role: users.role, isActive: users.isActive, schoolId: users.schoolId }).from(users).orderBy(desc(users.createdAt)).limit(300),
    db.select({ report: platformReports, reporterName: users.fullNameAr, reporterEmail: users.email }).from(platformReports).leftJoin(users, eq(users.id, platformReports.reporterId)).orderBy(desc(platformReports.createdAt)).limit(300),
    Promise.all([db.select({ id: users.id }).from(users), db.select({ id: platformReports.id }).from(platformReports), db.select({ id: schools.id }).from(schools)]),
  ])

  return <main className="platform-manager" dir="rtl">
    <header className="pm-header"><div><p className="pm-eyebrow">لوحة تحكم المنصة</p><h1>إدارة المنصة</h1><p>إدارة المدارس والحسابات ومتابعة بلاغات المستخدمين.</p></div><div className="pm-admin"><span>موثّق عبر Google</span><b>{session.user.email}</b></div></header>
    <section className="pm-stats" aria-label="ملخص المنصة">
      <article><small>المدارس</small><strong>{totals[2].length}</strong></article><article><small>الحسابات</small><strong>{totals[0].length}</strong></article><article><small>البلاغات المفتوحة</small><strong>{reportRows.filter(x => x.report.status !== 'resolved').length}</strong></article><article><small>كل البلاغات</small><strong>{totals[1].length}</strong></article>
    </section>

    <section className="pm-section" id="reports"><div className="pm-section-heading"><div><p className="pm-eyebrow">صندوق الوارد</p><h2>بلاغات المستخدمين</h2></div><span>{reportRows.length} بلاغ</span></div>
      {reportRows.length === 0 ? <p className="pm-empty">ما وصلت بلاغات بعد.</p> : <div className="pm-report-list">{reportRows.map(({ report, reporterName, reporterEmail }) => <article className="pm-report" key={report.id}>
        <div className="pm-report-top"><div><span className={`pm-status status-${report.status}`}>{statusLabel[report.status] ?? report.status}</span><span className="pm-category">{categoryLabel[report.category] ?? report.category}</span><h3>{report.subject}</h3></div><time>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(report.createdAt)}</time></div>
        <p className="pm-report-message">{report.message}</p><small>المرسل: {reporterName || 'حساب محذوف'}{reporterEmail ? ` · ${reporterEmail}` : ''}</small>
        <div className="pm-inline-actions"><form action={updateReportAction}><input type="hidden" name="id" value={report.id}/><select name="status" defaultValue={report.status} aria-label="حالة البلاغ"><option value="open">جديد</option><option value="reviewing">قيد المتابعة</option><option value="resolved">تم الحل</option></select><button className="pm-secondary">حفظ الحالة</button></form><form action={deleteReportAction}><input type="hidden" name="id" value={report.id}/><button className="pm-danger">حذف البلاغ</button></form></div>
      </article>)}</div>}
    </section>

    <section className="pm-section" id="schools"><div className="pm-section-heading"><div><p className="pm-eyebrow">المؤسسات</p><h2>المدارس</h2></div></div>
      <form action={createSchoolAction} className="pm-create-form"><h3>إضافة مدرسة</h3><label>المعرّف المختصر<input name="slug" placeholder="al-noor" pattern="[a-z0-9-]{2,100}" required/></label><label>الاسم بالعربي<input name="nameAr" maxLength={180} required/></label><label>الاسم بالإنجليزي<input name="nameEn" maxLength={180} required/></label><button className="pm-primary">إضافة المدرسة</button></form>
      <div className="pm-record-list">{schoolRows.map(school => <article className="pm-record" key={school.id}><form action={updateSchoolAction} className="pm-edit-grid"><input type="hidden" name="id" value={school.id}/><label>المعرّف<input name="slug" defaultValue={school.slug} required/></label><label>الاسم بالعربي<input name="nameAr" defaultValue={school.nameAr} required/></label><label>الاسم بالإنجليزي<input name="nameEn" defaultValue={school.nameEn} required/></label><button className="pm-secondary">حفظ التعديلات</button></form><div className="pm-inline-actions"><span className={`pm-status ${school.isActive ? 'status-open' : 'status-resolved'}`}>{school.isActive ? 'نشطة' : 'متوقفة'}</span><form action={toggleSchoolAction}><input type="hidden" name="id" value={school.id}/><input type="hidden" name="active" value={String(school.isActive)}/><button className="pm-secondary">{school.isActive ? 'تعطيل' : 'تفعيل'}</button></form><form action={deleteSchoolAction} className="pm-delete-form"><input type="hidden" name="id" value={school.id}/><label>اكتب {school.slug} للتأكيد<input name="confirmSlug" required/></label><button className="pm-danger">حذف المدرسة نهائيًا</button></form></div></article>)}</div>
    </section>

    <section className="pm-section" id="users"><div className="pm-section-heading"><div><p className="pm-eyebrow">الحسابات والصلاحيات</p><h2>المستخدمون</h2></div><span>يعرض آخر {userRows.length} حساب</span></div>
      <form action={createUserAction} className="pm-create-form"><h3>إضافة حساب</h3><label>البريد الإلكتروني<input name="email" type="email" required/></label><label>الاسم بالعربي<input name="nameAr" maxLength={160} required/></label><label>الاسم بالإنجليزي<input name="nameEn" maxLength={160} required/></label><label>كلمة مرور أولية (12 حرفًا على الأقل)<input name="password" type="password" minLength={12} required/></label><label>الدور<select name="role"><option value="student">طالب</option><option value="teacher">مدرس</option><option value="school_admin">إدارة مدرسة</option><option value="admin">مدير منصة</option></select></label><label>المدرسة<select name="schoolId"><option value="">بدون مدرسة</option>{schoolRows.map(s => <option value={s.id} key={s.id}>{s.nameAr}</option>)}</select></label><button className="pm-primary">إنشاء الحساب</button></form>
      <div className="pm-record-list">{userRows.map(user => <article className="pm-user" key={user.id}><div className="pm-user-heading"><div><b>{user.fullNameAr}</b><small>{user.email}</small></div><span className={`pm-status ${user.isActive ? 'status-open' : 'status-resolved'}`}>{user.isActive ? 'نشط' : 'معطّل'}</span></div>
        <form action={updateUserAction} className="pm-edit-grid"><input type="hidden" name="id" value={user.id}/><label>الاسم بالعربي<input name="nameAr" defaultValue={user.fullNameAr} required/></label><label>الاسم بالإنجليزي<input name="nameEn" defaultValue={user.fullNameEn} required/></label><label>البريد<input name="email" type="email" defaultValue={user.email} required/></label><label>الدور<select name="role" defaultValue={user.role}><option value="student">طالب</option><option value="teacher">مدرس</option><option value="school_admin">إدارة مدرسة</option><option value="admin">مدير منصة</option></select></label><label>المدرسة<select name="schoolId" defaultValue={user.schoolId ?? ''}><option value="">بدون مدرسة</option>{schoolRows.map(s => <option value={s.id} key={s.id}>{s.nameAr}</option>)}</select></label><button className="pm-secondary">حفظ الحساب</button></form>
        <div className="pm-inline-actions"><span>{roleLabel[user.role] ?? user.role}</span><form action={toggleUserAction}><input type="hidden" name="id" value={user.id}/><input type="hidden" name="active" value={String(user.isActive)}/><button className={user.isActive ? 'pm-danger' : 'pm-secondary'}>{user.isActive ? 'تعطيل الحساب' : 'إعادة التفعيل'}</button></form><form action={deleteUserAction} className="pm-delete-form"><input type="hidden" name="id" value={user.id}/><label>اكتب البريد {user.email} للتأكيد<input name="confirmEmail" type="email" required/></label><button className="pm-danger">حذف نهائي</button></form></div>
      </article>)}</div>
    </section>
  </main>
}

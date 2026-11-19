import Link from 'next/link'
import { desc, eq, sql, type SQL } from 'drizzle-orm'
import type { AnyPgTable } from 'drizzle-orm/pg-core'
import { ArrowLeft, Building2, GraduationCap, ShieldCheck, Users } from 'lucide-react'
import { requireDb } from '@/db'
import { classes, registrationRequests, schools, subjects, teachers, users } from '@/db/schema'
import { guardAdmin } from '@/lib/admin'
import {
  approveRegistrationAction,
  createSchoolAction,
  createStudentAction,
  createTeacherAction,
  createClassAction,
  createSubjectAction,
  rejectRegistrationAction,
} from '@/app/admin/actions'
import './admin.css'

const count = async (table: AnyPgTable, where?: SQL) => {
  const query = requireDb().select({ value: sql<number>`count(*)::int` }).from(table)
  const rows = where ? await query.where(where) : await query
  return rows[0]?.value ?? 0
}

async function createSchoolFormAction(formData: FormData): Promise<void> {
  'use server'
  await createSchoolAction(formData)
}

const roleLabel: Record<string, string> = {
  student: 'طالب', teacher: 'مدرس', school_admin: 'مسؤول مدرسة', admin: 'مدير منصة',
}

export const metadata = { title: 'لوحة الإدارة' }
export const instant = false

export default async function AdminPage() {
  await guardAdmin()
  const db = requireDb()
  const [userCount, studentCount, teacherCount, pendingCount, schoolRows, classRows, subjectRows, pendingRows, recentUsers] = await Promise.all([
    count(users),
    count(users, eq(users.role, 'student')),
    count(teachers),
    count(registrationRequests, eq(registrationRequests.status, 'pending')),
    db.select({ id: schools.id, nameAr: schools.nameAr, nameEn: schools.nameEn, slug: schools.slug, isActive: schools.isActive }).from(schools).orderBy(desc(schools.createdAt)).limit(100),
    db.select({ id: classes.id, schoolId: classes.schoolId, nameAr: classes.nameAr, gradeLevel: classes.gradeLevel, section: classes.section }).from(classes).orderBy(classes.gradeLevel).limit(200),
    db.select({ id: subjects.id, schoolId: subjects.schoolId, code: subjects.code, nameAr: subjects.nameAr }).from(subjects).orderBy(subjects.nameAr).limit(200),
    db.select({ id: registrationRequests.id, fullName: registrationRequests.fullName, email: registrationRequests.email, username: registrationRequests.username, phone: registrationRequests.phone, requestedRole: registrationRequests.requestedRole, createdAt: registrationRequests.createdAt }).from(registrationRequests).where(eq(registrationRequests.status, 'pending')).orderBy(desc(registrationRequests.createdAt)).limit(30),
    db.select({ id: users.id, fullName: users.fullNameAr, email: users.email, role: users.role, isActive: users.isActive }).from(users).orderBy(desc(users.createdAt)).limit(8),
  ])

  return <main className="admin-page" dir="rtl">
    <div className="admin-container">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark">م</span><span><strong>إدارة مدارس</strong><small>إدارة المنصة والحسابات</small></span></Link>
        <nav className="admin-nav" aria-label="التنقل الإداري">
          <Link href="/admin"><Building2 size={15}/> لوحة الإدارة</Link>
          <Link href="/admin/security"><ShieldCheck size={15}/> الأمان</Link>
          <Link href="/"><ArrowLeft size={15}/> البوابة</Link>
        </nav>
      </header>

      <section className="admin-heading">
        <div><span className="admin-eyebrow">مساحة الإدارة</span><h1>مرحبًا بك في لوحة الإدارة</h1><p>تابع المدارس والحسابات وطلبات التسجيل من مكان واحد.</p></div>
        <Link className="admin-link" href="/admin/security">إعدادات الأمان <ArrowLeft size={15}/></Link>
      </section>

      <section className="admin-stats" aria-label="ملخص المنصة">
        <article className="admin-stat"><span>إجمالي الحسابات</span><strong>{userCount}</strong></article>
        <article className="admin-stat"><span>الطلاب</span><strong>{studentCount}</strong></article>
        <article className="admin-stat"><span>المدرسون</span><strong>{teacherCount}</strong></article>
        <article className="admin-stat"><span>المواد</span><strong>{subjectRows.length}</strong></article>
        <article className="admin-stat"><span>طلبات بانتظار المراجعة</span><strong>{pendingCount}</strong></article>
      </section>

      <div className="admin-columns">
        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>طلبات التسجيل</h2><p>راجع بيانات الطلب ثم اعتمده أو ارفضه.</p></div><span className="admin-count">{pendingRows.length} طلب</span></div>
          {pendingRows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>نوع الحساب</th><th>بيانات التواصل</th><th>الإجراء</th></tr></thead><tbody>{pendingRows.map(row => <tr key={row.id}>
            <td className="admin-user">{row.fullName || 'بدون اسم'}{row.username && <div className="admin-muted">@{row.username}</div>}</td>
            <td><span className="admin-badge">{roleLabel[row.requestedRole] || 'طالب'}</span></td>
            <td>{row.email.endsWith('@school-pulse.invalid') ? row.phone || '—' : row.email}{row.phone && !row.email.endsWith('@school-pulse.invalid') && <div className="admin-muted">{row.phone}</div>}</td>
            <td><div className="admin-inline-actions"><form action={approveRegistrationAction}><input type="hidden" name="id" value={row.id}/><button type="submit">اعتماد</button></form><form action={rejectRegistrationAction}><input type="hidden" name="id" value={row.id}/><button className="secondary" type="submit">رفض</button></form></div></td>
          </tr>)}</tbody></table></div> : <div className="admin-empty">ماكو طلبات تسجيل معلّقة حاليًا.</div>}
        </section>

        <div>
          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>إضافة مدرسة</h2><p>أنشئ مساحة جديدة على المنصة.</p></div><Building2 size={18} color="#598575"/></div>
            <form action={createSchoolFormAction} className="admin-form">
              <label>اسم المدرسة بالعربية<input name="nameAr" minLength={2} maxLength={180} required placeholder="مدرسة النور"/></label>
              <label>اسم المدرسة بالإنكليزية<input name="nameEn" minLength={2} maxLength={180} required placeholder="Al Noor School"/></label>
              <label>معرّف المدرسة (slug)<input name="slug" minLength={2} maxLength={99} pattern="[a-z0-9][a-z0-9-]{1,98}" required placeholder="al-noor-school" dir="ltr"/></label>
              <button className="admin-btn" type="submit">إنشاء المدرسة</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>إعداد المدرسة</h2><p>أضف صفوفًا ومواد للمدرسة المحددة.</p></div><GraduationCap size={18} color="#598575"/></div>
            <form action={createClassAction} className="admin-form two-col">
              <label className="span-two">المدرسة<select name="schoolId" required defaultValue=""><option value="" disabled>اختر مدرسة</option>{schoolRows.map(school => <option key={school.id} value={school.id}>{school.nameAr}</option>)}</select></label>
              <label>اسم الصف بالعربية<input name="nameAr" required maxLength={120}/></label><label>اسم الصف بالإنكليزية<input name="nameEn" required maxLength={120}/></label>
              <label>المرحلة<input name="gradeLevel" type="number" min="1" max="12" required/></label><label>الشعبة<input name="section" maxLength={40}/></label>
              <button className="admin-btn span-two" type="submit">إضافة الصف</button>
            </form>
            <form action={createSubjectAction} className="admin-form two-col" style={{marginTop:18,paddingTop:17,borderTop:'1px solid #edf0ed'}}>
              <label className="span-two">المدرسة<select name="schoolId" required defaultValue=""><option value="" disabled>اختر مدرسة</option>{schoolRows.map(school => <option key={school.id} value={school.id}>{school.nameAr}</option>)}</select></label>
              <label>رمز المادة<input name="code" required maxLength={40}/></label><label>الاسم بالعربية<input name="nameAr" required maxLength={120}/></label><label className="span-two">الاسم بالإنكليزية<input name="nameEn" required maxLength={120}/></label>
              <button className="admin-btn span-two" type="submit">إضافة المادة</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>إنشاء حساب طالب</h2><p>أضف طالبًا إلى إحدى المدارس.</p></div><Users size={18} color="#598575"/></div>
            <form action={createStudentAction} className="admin-form">
              <label>المدرسة<select name="schoolId" required defaultValue=""><option value="" disabled>اختر مدرسة</option>{schoolRows.map(school => <option key={school.id} value={school.id}>{school.nameAr}</option>)}</select></label>
              <label>الصف<select name="classId" required defaultValue=""><option value="" disabled>اختر الصف</option>{classRows.map(row => <option key={row.id} value={row.id}>{row.nameAr} · {schoolRows.find(school => school.id === row.schoolId)?.nameAr || ''}</option>)}</select></label>
              <label>الاسم بالعربية<input name="fullNameAr" required maxLength={160}/></label><label>الاسم بالإنكليزية<input name="fullNameEn" required maxLength={160}/></label>
              <label>البريد الإلكتروني<input name="email" type="email" required maxLength={320}/></label><label>الرقم الدراسي<input name="code" required maxLength={60}/></label>
              <label>كلمة المرور<input name="password" type="password" required minLength={8} maxLength={128}/></label>
              <button className="admin-btn" type="submit">إنشاء الحساب</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>إنشاء حساب مدرس</h2><p>أضف مدرسًا إلى إحدى المدارس.</p></div><GraduationCap size={18} color="#598575"/></div>
            <form action={createTeacherAction} className="admin-form">
              <label>المدرسة<select name="schoolId" required defaultValue=""><option value="" disabled>اختر مدرسة</option>{schoolRows.map(school => <option key={school.id} value={school.id}>{school.nameAr}</option>)}</select></label>
              <label>الاسم بالعربية<input name="fullNameAr" required maxLength={160}/></label><label>الاسم بالإنكليزية<input name="fullNameEn" required maxLength={160}/></label>
              <label>البريد الإلكتروني<input name="email" type="email" required maxLength={320}/></label><label>الرقم الوظيفي<input name="code" required maxLength={60}/></label>
              <label>كلمة المرور<input name="password" type="password" required minLength={8} maxLength={128}/></label>
              <button className="admin-btn" type="submit">إنشاء الحساب</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>المدارس</h2><p>المساحات المسجلة على المنصة.</p></div><span className="admin-count">{schoolRows.length}</span></div>
            {schoolRows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المدرسة</th><th>المعرّف</th><th>الحالة</th></tr></thead><tbody>{schoolRows.map(school => <tr key={school.id}><td className="admin-user">{school.nameAr}<div className="admin-muted">{school.nameEn}</div></td><td dir="ltr">{school.slug}</td><td><span className="admin-badge">{school.isActive ? 'فعّالة' : 'متوقفة'}</span></td></tr>)}</tbody></table></div> : <div className="admin-empty">لم تتم إضافة مدرسة بعد.</div>}
          </section>
        </div>
      </div>

      <section className="admin-panel" style={{marginTop: 1}}>
        <div className="admin-panel-head"><div><h2>آخر الحسابات</h2><p>أحدث الحسابات المسجلة على المنصة.</p></div><Users size={18} color="#598575"/></div>
        {recentUsers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>البريد</th><th>الصلاحية</th><th>الحالة</th></tr></thead><tbody>{recentUsers.map(user => <tr key={user.id}><td className="admin-user">{user.fullName}</td><td dir="ltr">{user.email}</td><td><span className="admin-badge">{roleLabel[user.role] || user.role}</span></td><td>{user.isActive ? 'نشط' : 'موقوف'}</td></tr>)}</tbody></table></div> : <div className="admin-empty"><GraduationCap size={18}/> لا توجد حسابات بعد.</div>}
      </section>
      <footer className="admin-footer">بوابة مدارس · لوحة محمية للمسؤولين</footer>
    </div>
  </main>
}

import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react'
import { db } from '@/db'
import { classes, subjects } from '@/db/schema'
import { getRegistrationContext } from '@/lib/google'
import { inspectInvite } from '@/lib/invitations'
import { submitPasswordRegistrationAction, submitRegistrationAction } from './actions'

export const metadata = { title: 'إنشاء حساب' }
type Role = 'student' | 'teacher' | 'school_admin'
const errors: Record<string, string> = {
  name: 'اكتب اسمك الثلاثي بشكل صحيح.', birth_date: 'اختر تاريخ ميلاد صحيحًا.', class: 'اختر الصف والفرع.', subject: 'اختر المادة التي تدرّسها.',
  identifier: 'أدخل اسم مستخدم أو بريدًا إلكترونيًا أو رقم هاتف.', username: 'اسم المستخدم يجب أن يكون بين ٥ و٣٢ حرفًا.',
  email: 'البريد الإلكتروني غير صحيح.', email_required: 'البريد الإلكتروني مطلوب.', phone: 'أدخل رقم هاتف عراقي صحيح.', password: 'كلمة المرور ٨ أحرف على الأقل وتحتوي رقمًا وحرفًا.',
  password_mismatch: 'كلمتا المرور غير متطابقتين.', username_taken: 'اسم المستخدم مستخدم مسبقًا.', email_taken: 'البريد الإلكتروني مستخدم مسبقًا.', phone_taken: 'رقم الهاتف مسجل مسبقًا.',
  phone_pending: 'يوجد طلب تسجيل بهذا الرقم بانتظار المراجعة.', rate_limited: 'محاولات كثيرة. انتظر قليلًا ثم حاول.', invite: 'رمز الدعوة غير صالح أو منتهي أو مخصص لنوع حساب آخر.',
}

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  const query = await searchParams
  const googleRequest = await getRegistrationContext()
  const googleRole = googleRequest?.requestedRole === 'teacher' ? 'teacher' : 'student'
  const role: Role = googleRequest ? googleRole : query.role === 'teacher' || query.role === 'school_admin' ? query.role : 'student'
  const inviteCode = typeof query.invite === 'string' ? query.invite : ''
  const invite = inviteCode ? await inspectInvite(inviteCode, role) : null
  const error = typeof query.error === 'string' ? query.error : ''
  const submitted = query.submitted === '1'
  const isGoogleDraft = googleRequest?.status === 'draft'
  const isGooglePending = googleRequest?.status === 'pending'
  const [classRows, subjectRows] = db && invite ? await Promise.all([
    db.select({ id: classes.id, nameAr: classes.nameAr, gradeLevel: classes.gradeLevel, section: classes.section }).from(classes).where(eq(classes.schoolId, invite.schoolId)).orderBy(classes.gradeLevel, classes.section),
    db.select({ id: subjects.id, nameAr: subjects.nameAr }).from(subjects).where(eq(subjects.schoolId, invite.schoolId)).orderBy(subjects.nameAr),
  ]) : [[], []]
  const missingOptions = !invite || (role === 'student' ? classRows.length === 0 : role === 'teacher' ? subjectRows.length === 0 : false)
  const roleHref = (next: Role) => `/register?role=${next}${inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : ''}`

  return (
    <main className="register-page">
      <section className="register-card">
        <Link href="/login" className="register-back"><ArrowRight size={16} /> رجوع إلى تسجيل الدخول</Link>
        <header className="register-header">
          <span className="register-logo"><BookOpen size={22} /></span>
          <p>بوابة مدارس</p>
          <h1>إنشاء حساب جديد</h1>
          <small>أرسل طلبك، وستفعّل الإدارة الحساب بعد مراجعته.</small>
        </header>
        {!googleRequest && <div className="register-role-tabs">
          <Link href={roleHref('student')} className={role === 'student' ? 'active' : ''}><GraduationCap size={17} /> طالب</Link>
          <Link href={roleHref('teacher')} className={role === 'teacher' ? 'active' : ''}><BookOpen size={17} /> مدرس</Link>
          <Link href={roleHref('school_admin')} className={role === 'school_admin' ? 'active' : ''}><ShieldCheck size={16} /> مسؤول مدرسة</Link>
        </div>}
        {submitted && <div className="register-success" role="status"><b>وصل طلبك بنجاح.</b><span>تراجع الإدارة الطلب، وبعد الموافقة تقدر تدخل بحسابك.</span></div>}
        {isGooglePending && <div className="register-success" role="status"><b>طلب تسجيل Google قيد المراجعة.</b><span>تم استلام طلب {googleRequest.email}، وتقدر تدخل بعد اعتماد الإدارة.</span></div>}
        {errors[error] && <div className="login-error" role="alert">{errors[error]}</div>}
        {!invite && !isGooglePending && <div className="register-info">أدخل رمز دعوة المدرسة الذي استلمته حتى نعرض صفوفها وموادها.</div>}
        {invite && <div className="register-success"><b>{invite.schoolAr}</b><span>رمز الدعوة صالح لهذا النوع من الحسابات.</span></div>}
        {missingOptions && invite && !isGooglePending && <div className="register-info">ماكو خيارات مسجلة حاليًا. تواصل مع إدارة المدرسة حتى تضيف الصفوف أو المواد.</div>}
        {isGoogleDraft && <div className="register-success"><b>تم التحقق من حساب Google</b><span>{googleRequest.email} · أكمل بيانات المدرسة لإرسال طلب التسجيل.</span></div>}
        {!isGooglePending && <form action={isGoogleDraft ? submitRegistrationAction : submitPasswordRegistrationAction} className="register-form">
          <input type="hidden" name="requestedRole" value={role} />
          <div className="register-fields">
            <label className="span-two">رمز دعوة المدرسة<input name="inviteCode" defaultValue={inviteCode} autoComplete="off" required /></label>
            <label className="span-two">الاسم الثلاثي<input name="fullName" autoComplete="name" defaultValue={isGoogleDraft ? googleRequest.googleName ?? '' : ''} placeholder="الاسم كما يظهر في سجلات المدرسة" required minLength={5} /></label>
            {isGoogleDraft ? <>
              <label className="span-two">البريد الموثق عبر Google<input value={googleRequest.email} readOnly /></label>
              <input type="hidden" name="email" value={googleRequest.email} />
              <label>اسم المستخدم <small>(اختياري)</small><input name="username" autoComplete="username" placeholder="مثال: ali.student" minLength={5} maxLength={32} /></label>
              <label>رقم الهاتف {role === 'teacher' && <small>(مطلوب)</small>}<input name="phone" type="tel" autoComplete="tel" placeholder="07xx xxx xxxx" required /></label>
              {role === 'student' && <>
                <label>تاريخ الميلاد<input name="birthDate" type="date" required /></label>
                <label className="span-two">الصف والفرع / الشعبة<select name="classId" required defaultValue=""><option value="" disabled>اختر الصف والفرع</option>{classRows.map(row => <option key={row.id} value={row.id}>{row.nameAr} · الصف {row.gradeLevel}{row.section ? ` · الفرع ${row.section}` : ''}</option>)}</select></label>
              </>}
              {role === 'teacher' && <label className="span-two">المادة التي تدرّسها<select name="subjectId" required defaultValue=""><option value="" disabled>اختر المادة</option>{subjectRows.map(row => <option key={row.id} value={row.id}>{row.nameAr}</option>)}</select></label>}
            </> : <>
              <label>اسم المستخدم <small>(اختياري)</small><input name="username" autoComplete="username" placeholder="مثال: ali.student" minLength={5} maxLength={32} /></label>
              <label>البريد الإلكتروني {role === 'school_admin' && <small>(مطلوب)</small>}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required={role === 'school_admin'} /></label>
              <label>رقم الهاتف {role === 'teacher' && <small>(مطلوب)</small>}<input name="phone" type="tel" autoComplete="tel" placeholder="07xx xxx xxxx" required={role === 'teacher'} /></label>
              {role === 'student' && <>
                <label>تاريخ الميلاد<input name="birthDate" type="date" required /></label>
                <label className="span-two">الصف والفرع / الشعبة<select name="classId" required defaultValue=""><option value="" disabled>اختر الصف والفرع</option>{classRows.map(row => <option key={row.id} value={row.id}>{row.nameAr} · الصف {row.gradeLevel}{row.section ? ` · الفرع ${row.section}` : ''}</option>)}</select></label>
              </>}
              {role === 'teacher' && <label className="span-two">المادة التي تدرّسها<select name="subjectId" required defaultValue=""><option value="" disabled>اختر المادة</option>{subjectRows.map(row => <option key={row.id} value={row.id}>{row.nameAr}</option>)}</select></label>}
              <label>كلمة المرور<input name="password" type="password" autoComplete="new-password" placeholder="٨ أحرف على الأقل" required minLength={8} /></label>
              <label>تأكيد كلمة المرور<input name="passwordConfirm" type="password" autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" required minLength={8} /></label>
            </>}
          </div>
          <button className="login-submit" type="submit" disabled={missingOptions}>إرسال طلب التسجيل <ArrowRight size={16} /></button>
          <p className="register-approval">{role === 'teacher' ? 'طلب المدرس يحتاج مراجعة واعتماد الإدارة.' : 'طلب الطالب يحتاج مراجعة واعتماد الإدارة.'}</p>
        </form>}
      </section>
    </main>
  )
}

import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react'
import { db } from '@/db'
import { classes, subjects } from '@/db/schema'
import { inspectInvite } from '@/lib/invitations'
import { getRegistrationContext } from '@/lib/google'
import { submitPasswordRegistrationAction, submitRegistrationAction } from './actions'

export const metadata = { title: 'إنشاء حساب' }
type Role = 'student' | 'teacher' | 'school_admin'
const errors: Record<string, string> = {
  name: 'اكتب اسمك الثلاثي بشكل صحيح.', birth_date: 'اختر تاريخ ميلاد صحيحًا.', class: 'اختر الصف والشعبة.', subject: 'اختر المادة التي تدرّسها.',
  identifier: 'أدخل اسم مستخدم أو بريدًا إلكترونيًا أو رقم هاتف.', username: 'اسم المستخدم يجب أن يكون بين ٥ و٣٢ حرفًا.',
  email: 'البريد الإلكتروني غير صحيح.', email_required: 'البريد الإلكتروني مطلوب.', phone: 'أدخل رقم هاتف عراقي صحيح.', password: 'كلمة المرور ٨ أحرف على الأقل وتحتوي رقمًا وحرفًا.',
  password_mismatch: 'كلمتا المرور غير متطابقتين.', username_taken: 'اسم المستخدم مستخدم مسبقًا.', email_taken: 'البريد الإلكتروني مستخدم مسبقًا.', phone_taken: 'رقم الهاتف مسجل مسبقًا.',
  phone_pending: 'يوجد طلب تسجيل بهذا الرقم بانتظار المراجعة.', rate_limited: 'محاولات كثيرة. انتظر قليلًا ثم حاول.', invite: 'رمز الدعوة غير صالح أو منتهي أو مخصص لنوع حساب آخر.',
}

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  const query = await searchParams
  const googleMode = query.method === 'google'
  const googleRequest = googleMode ? await getRegistrationContext() : null
  if (googleMode && !googleRequest) redirect('/login?error=registration_expired')
  const role: Role = googleMode
    ? googleRequest?.requestedRole === 'teacher' ? 'teacher' : 'student'
    : query.role === 'teacher' || query.role === 'school_admin' ? query.role : 'student'
  const inviteCode = typeof query.invite === 'string' ? query.invite : ''
  const invite = inviteCode ? await inspectInvite(inviteCode, role) : null
  const error = typeof query.error === 'string' ? query.error : ''
  const submitted = query.submitted === '1' || googleRequest?.status === 'pending'
  const [classRows, subjectRows] = db && invite ? await Promise.all([
    db.select({ id: classes.id, nameAr: classes.nameAr, gradeLevel: classes.gradeLevel, section: classes.section }).from(classes).where(eq(classes.schoolId, invite.schoolId)).orderBy(classes.gradeLevel, classes.section),
    db.select({ id: subjects.id, nameAr: subjects.nameAr }).from(subjects).where(eq(subjects.schoolId, invite.schoolId)).orderBy(subjects.nameAr),
  ]) : [[], []]
  const missingOptions = Boolean(invite) && (role === 'student' ? classRows.length === 0 : role === 'teacher' ? subjectRows.length === 0 : false)
  const roleHref = (next: Role) => `/register?role=${next}${inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : ''}`
  const action = googleMode ? submitRegistrationAction : submitPasswordRegistrationAction

  return <main className="register-page"><section className="register-card"><Link href="/login" className="register-back"><ArrowRight size={16}/> رجوع إلى تسجيل الدخول</Link><header className="register-header"><span className="register-logo"><BookOpen size={22}/></span><p>بوابة مدارس</p><h1>{googleMode ? 'إكمال التسجيل عبر Google' : 'إنشاء حساب جديد'}</h1><small>{googleMode ? 'أكمل بياناتك لإرسال طلب التسجيل إلى إدارة المدرسة.' : 'أرسل طلبك، وستفعّل الإدارة الحساب بعد مراجعته.'}</small></header>{!googleMode && <div className="register-role-tabs"><Link href={roleHref('student')} className={role === 'student' ? 'active' : ''}><GraduationCap size={17}/> طالب</Link><Link href={roleHref('teacher')} className={role === 'teacher' ? 'active' : ''}><BookOpen size={17}/> مدرس</Link><Link href={roleHref('school_admin')} className={role === 'school_admin' ? 'active' : ''}><ShieldCheck size={16}/> مسؤول مدرسة</Link></div>}{submitted && <div className="register-success" role="status"><b>وصل طلبك بنجاح.</b><span>تراجع الإدارة الطلب، وبعد الموافقة تقدر تدخل بحسابك.</span></div>}{errors[error] && <div className="login-error" role="alert">{errors[error]}</div>}{!invite && <div className="register-info">أدخل رمز الدعوة الذي استلمته من مدرستك حتى نعرض صفوفها وموادها.</div>}{invite && <div className="register-success"><b>{invite.schoolAr}</b><span>رمز الدعوة صالح لهذا النوع من الحسابات.</span></div>}{missingOptions && invite && <div className="register-info">ماكو خيارات مسجلة حاليًا. تواصل مع إدارة المدرسة حتى تضيف الصفوف أو المواد.</div>}{!submitted && <form action={action} className="register-form"><input type="hidden" name="requestedRole" value={role}/><div className="register-fields"><label className="span-two">رمز دعوة المدرسة<input name="inviteCode" defaultValue={inviteCode} autoComplete="off" required/></label>{googleMode && <label className="span-two">حساب Google<input value={googleRequest?.email ?? ''} readOnly/></label>}<label className="span-two">الاسم الثلاثي<input name="fullName" autoComplete="name" defaultValue={googleMode ? '' : undefined} placeholder="الاسم كما يظهر في سجلات المدرسة" required minLength={5}/></label><label>اسم المستخدم <small>(اختياري)</small><input name="username" autoComplete="username" placeholder="اسم مستخدم مناسب" minLength={5} maxLength={32}/></label>{!googleMode && <><label>البريد الإلكتروني {role === 'school_admin' && <small>(مطلوب)</small>}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required={role === 'school_admin'}/></label><label>رقم الهاتف {role === 'teacher' && <small>(مطلوب)</small>}<input name="phone" type="tel" autoComplete="tel" placeholder="07xx xxx xxxx" required={role === 'teacher'}/></label></>}{googleMode && <label>رقم الهاتف<input name="phone" type="tel" autoComplete="tel" placeholder="07xx xxx xxxx" required/></label>}{role === 'student' && <><label>تاريخ الميلاد<input name="birthDate" type="date" required/></label>{invite && <label className="span-two">الصف والفرع / الشعبة<select name="classId" required defaultValue=""><option value="" disabled>اختر الصف والشعبة</option>{classRows.map(row => <option key={row.id} value={row.id}>{row.nameAr} · الصف {row.gradeLevel}{row.section ? ` · الشعبة ${row.section}` : ''}</option>)}</select></label>}</>}{role === 'teacher' && invite && <label className="span-two">المادة التي تدرّسها<select name="subjectId" required defaultValue=""><option value="" disabled>اختر المادة</option>{subjectRows.map(row => <option key={row.id} value={row.id}>{row.nameAr}</option>)}</select></label>}{!googleMode && <><label>كلمة المرور<input name="password" type="password" autoComplete="new-password" placeholder="٨ أحرف على الأقل" required minLength={8}/></label><label>تأكيد كلمة المرور<input name="passwordConfirm" type="password" autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" required minLength={8}/></label></>}</div><button className="login-submit" type="submit" disabled={missingOptions}>إرسال طلب التسجيل <ArrowRight size={16}/></button><p className="register-approval">{role === 'teacher' ? 'طلب المدرس يحتاج مراجعة واعتماد الإدارة.' : role === 'school_admin' ? 'طلب مسؤول المدرسة يحتاج اعتماد مسؤول المنصة.' : 'طلب الطالب يحتاج مراجعة واعتماد الإدارة.'}</p></form>}</section></main>
}

'use client'

import { useState } from 'react'
import { BookOpen, GraduationCap, ShieldCheck, UserRound, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { loginAction } from '@/app/login/actions'

type Role = 'student' | 'teacher' | 'admin'
const roles: { id: Role; title: string; detail: string; Icon: typeof BookOpen }[] = [
  { id: 'student', title: 'الطالب', detail: 'درجاتك وواجباتك', Icon: GraduationCap },
  { id: 'teacher', title: 'المدرس', detail: 'صفوفك وطلابك', Icon: BookOpen },
  { id: 'admin', title: 'الإدارة', detail: 'إدارة المنصة', Icon: ShieldCheck },
]

export function LoginExperience({ initialRole = 'student', error = '' }: { initialRole?: Role; error?: string }) {
  const [role, setRole] = useState<Role>(initialRole)
  const roleTitle = role === 'student' ? 'الطالب' : role === 'teacher' ? 'المدرس' : 'الإدارة'
  const errorText: Record<string, string> = {
    invalid: 'بيانات الدخول غير صحيحة.', missing: 'أدخل اسم المستخدم وكلمة المرور.', rate_limited: 'محاولات كثيرة. انتظر قليلًا ثم حاول.',
    password_locked: 'تم إيقاف المحاولات مؤقتًا لحماية الحساب.', registration_expired: 'انتهت جلسة التسجيل. ابدأ من جديد.',
    google_not_configured: 'تسجيل Google غير مهيأ حاليًا.', google_cancelled: 'تم إلغاء تسجيل Google.', google_wrong_role: 'هذا الحساب مرتبط بنوع حساب آخر. اختر النوع الصحيح.',
    account_inactive: 'الحساب غير مفعّل. تواصل مع إدارة المدرسة.', google_state: 'انتهت صلاحية محاولة Google. حاول مرة ثانية.',
  }
  return <main className="login-page"><div className="login-decoration"><span className="login-orb orb-a"/><span className="login-orb orb-b"/><div className="login-brand"><span className="brand-mark"><span>م</span></span><span><b>مَدارِس</b><small>مساحتك للتعلّم والنمو</small></span></div><div className="login-quote"><span>✦</span><h1>رحلتك التعليمية<br/>تبدأ من هنا.</h1><p>تابع دراستك، أنجز مهامك، واحتفل بكل خطوة إلى الأمام.</p><div className="login-dots"><i/><i/><i/></div></div><div className="login-footer-note">بوابة تعليمية آمنة ومخصصة لطلبة المدرسة</div></div><section className="login-form-wrap"><div className="login-form-card"><div className="login-welcome"><span className="login-welcome-icon">👋</span><p>أهلًا بك من جديد</p><h2>اختر نوع حسابك</h2><small>حتى نعرض لك صفحة الدخول المناسبة.</small></div><div className="login-role-grid" role="group" aria-label="اختيار نوع الحساب">{roles.map(({id,title,detail,Icon})=><button key={id} type="button" onClick={()=>setRole(id)} aria-pressed={role===id} className={`login-role-card ${role===id?'selected':''}`}><span className="role-icon"><Icon size={21}/></span><b>{title}</b><small>{detail}</small></button>)}</div><div className="selected-role-heading"><span className="selected-role-icon"><UserRound size={16}/></span><span><b>دخول {roleTitle}</b><small>استخدم بيانات الحساب المسجل في المدرسة.</small></span></div>{errorText[error]&&<div className="login-error" role="alert">{errorText[error]}</div>}<form action={loginAction} className="login-form"><input type="hidden" name="loginRole" value={role}/><label>اسم المستخدم أو البريد أو الهاتف<span><input name="identifier" autoComplete="username" placeholder={role==='admin'?'اسم المستخدم أو البريد الإداري':'اكتب اسم المستخدم أو البريد'} required/></span></label><label>كلمة المرور<span><input type="password" name="password" autoComplete="current-password" placeholder="أدخل كلمة المرور" required/></span></label><button type="submit" className="login-submit">دخول {roleTitle} <ArrowLeft size={16}/></button></form>{role!=='admin'&&<><a className="google-login-btn" href={`/api/auth/google?role=${role}`}><span aria-hidden="true">G</span> المتابعة باستخدام Google</a><div className="register-prompt">حسابك جديد؟ <Link href={`/register?role=${role}`}>إنشاء حساب {roleTitle}</Link></div></>}<p className="login-help">تواجه مشكلة في الدخول؟ تواصل مع إدارة مدرستك.</p><small className="login-privacy">بتسجيل الدخول، أنت توافق على سياسة الاستخدام والخصوصية.</small></div></section></main>
}

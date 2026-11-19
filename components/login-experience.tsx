'use client'

import { useState } from 'react'
import { BookOpen, GraduationCap, ShieldCheck, UserRound, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { loginAction } from '@/app/login/actions'
import { startPreview } from '@/app/preview-actions'

type Role = 'student' | 'teacher' | 'admin'
const roles: { id: Role; title: string; detail: string; Icon: typeof BookOpen }[] = [
  { id: 'student', title: 'الطالب', detail: 'درجاتك وواجباتك', Icon: GraduationCap },
  { id: 'teacher', title: 'المدرس', detail: 'صفوفك وطلابك', Icon: BookOpen },
  { id: 'admin', title: 'الإدارة', detail: 'إدارة المنصة', Icon: ShieldCheck },
]

export function LoginExperience({
  initialRole = 'student',
  error = '',
  googleVerified = false,
}: {
  initialRole?: Role
  error?: string
  googleVerified?: boolean
}) {
  const [role, setRole] = useState<Role>(initialRole)
  const roleTitle = role === 'student' ? 'الطالب' : role === 'teacher' ? 'المدرس' : 'الإدارة'
  const errorText: Record<string, string> = {
    invalid: 'بيانات الدخول غير صحيحة.',
    missing: 'أدخل اسم المستخدم وكلمة المرور.',
    rate_limited: 'محاولات كثيرة. انتظر قليلًا ثم حاول.',
    password_locked: 'تم إيقاف المحاولات مؤقتًا لحماية الحساب.',
    registration_expired: 'انتهت جلسة التسجيل. ابدأ من جديد.',
    google_not_configured: 'تسجيل الدخول عبر Google غير مهيأ حاليًا.',
    google_cancelled: 'ألغيت تسجيل الدخول عبر Google.',
    google_state: 'تعذر التحقق من جلسة Google. حاول مرة ثانية.',
    google_code: 'لم يكتمل تسجيل الدخول عبر Google.',
    google_token: 'تعذر تأكيد حساب Google. حاول مرة ثانية.',
    google_profile: 'تعذر قراءة بيانات حساب Google الموثق.',
    google_wrong_role: 'حساب Google هذا غير مرتبط بنوع الحساب المختار.',
    account_inactive: 'الحساب غير مفعّل. تواصل مع إدارة المدرسة.',
  }

  return (
    <main className="login-page">
      <div className="login-decoration">
        <span className="login-orb orb-a" />
        <span className="login-orb orb-b" />
        <div className="login-brand">
          <span className="brand-mark"><span>م</span></span>
          <span><b>مَدارِس</b><small>مساحتك للتعلّم والنمو</small></span>
        </div>
        <div className="login-quote">
          <span>✦</span>
          <h1>رحلتك التعليمية<br />تبدأ من هنا.</h1>
          <p>تابع دراستك، أنجز مهامك، واحتفل بكل خطوة إلى الأمام.</p>
          <div className="login-dots"><i /><i /><i /></div>
        </div>
        <div className="login-footer-note">بوابة تعليمية آمنة ومخصصة لطلبة المدرسة</div>
      </div>
      <section className="login-form-wrap">
        <div className="login-form-card">
          <div className="login-welcome">
            <span className="login-welcome-icon">👋</span>
            <p>أهلًا بك من جديد</p>
            <h2>اختر نوع حسابك</h2>
            <small>حتى نعرض لك صفحة الدخول المناسبة.</small>
          </div>
          <div className="login-role-grid" role="group" aria-label="اختيار نوع الحساب">
            {roles.map(({ id, title, detail, Icon }) => (
              <button key={id} type="button" onClick={() => setRole(id)} aria-pressed={role === id} className={`login-role-card ${role === id ? 'selected' : ''}`}>
                <span className="role-icon"><Icon size={21} /></span>
                <b>{title}</b>
                <small>{detail}</small>
              </button>
            ))}
          </div>
          <div className="selected-role-heading">
            <span className="selected-role-icon"><UserRound size={16} /></span>
            <span><b>دخول {roleTitle}</b><small>استخدم بيانات الحساب المسجل في المدرسة.</small></span>
          </div>
          {errorText[error] && <div className="login-error" role="alert">{errorText[error]}</div>}
          {googleVerified && role === 'admin' && <div className="google-login-verified" role="status">تم التحقق من بريد Google. أكمل الدخول بكلمة مرور الإدارة.</div>}
          <form action={loginAction} className="login-form">
            <input type="hidden" name="loginRole" value={role} />
            <label>اسم المستخدم أو البريد أو الهاتف<span><input name="identifier" autoComplete="username" placeholder={role === 'admin' ? 'اسم المستخدم أو البريد الإداري' : 'اكتب اسم المستخدم أو البريد'} required /></span></label>
            <label>كلمة المرور<span><input type="password" name="password" autoComplete="current-password" placeholder="أدخل كلمة المرور" required /></span></label>
            <button type="submit" className="login-submit">دخول {roleTitle} <ArrowLeft size={16} /></button>
          </form>
          <div className="login-divider"><span>أو</span></div>
          <a className="login-google-button" href={`/api/auth/google?role=${role}`}>
            <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.5H5.8v5.3A20 20 0 0 0 24 44Z" />
              <path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7v-5.3H5.8a20 20 0 0 0 0 17.6l6.8-5.3Z" />
              <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
            </svg>
            <span>تسجيل الدخول باستخدام Google</span>
          </a>
          {role !== 'admin' && <div className="register-prompt">حسابك جديد؟ <Link href={`/register?role=${role}`}>إنشاء حساب {roleTitle}</Link></div>}
          {role === 'student' && process.env.NODE_ENV !== 'production' && <form action={startPreview} className="preview-form"><button className="preview-submit" type="submit"><Sparkles size={14} /> معاينة الواجهة ببيانات تجريبية</button></form>}
          <p className="login-help">تواجه مشكلة في الدخول؟ <a href="mailto:school@example.edu.iq">تواصل مع إدارة المدرسة</a></p>
          <small className="login-privacy">بتسجيل الدخول، أنت توافق على سياسة الاستخدام والخصوصية.</small>
        </div>
      </section>
    </main>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { cookies } from 'next/headers'
import { cancelTwoFactorAction, verifyTwoFactorAction } from '@/app/login/actions'

const errors: Record<string, string> = {
  missing: 'أدخل رمز التحقق أو رمز الاسترداد.',
  expired: 'انتهت صلاحية الطلب. سجّل الدخول من جديد.',
  locked: 'تجاوزت عدد المحاولات المسموح. ابدأ تسجيل الدخول مجددًا.',
  'not-configured': 'المصادقة الثنائية غير مكتملة. سجّل الدخول مجددًا.',
  invalid: 'الرمز غير صحيح. جرّب مرة ثانية.',
}

export const metadata = { title: 'التحقق بخطوتين' }

export default async function TwoFactorLoginPage({ searchParams }: PageProps<'/login/2fa'>) {
  const store = await cookies()
  if (!store.get('school_pulse_2fa_challenge')?.value) redirect('/login?role=admin')
  const query = await searchParams
  const error = typeof query.error === 'string' ? errors[query.error] : undefined
  return <main className="login-page" dir="rtl"><div className="login-decoration"><span className="login-orb orb-a"/><span className="login-orb orb-b"/><div className="login-brand"><span className="brand-mark"><span>م</span></span><span><b>مَدارِس</b><small>بوابة الإدارة الآمنة</small></span></div><div className="login-quote"><ShieldCheck size={30}/><h1>خطوة إضافية<br/>لحماية حسابك.</h1><p>أدخل الرمز الظاهر في تطبيق المصادقة لإكمال تسجيل الدخول.</p></div><div className="login-footer-note">لا تشارك رمز التحقق مع أي شخص</div></div><section className="login-form-wrap"><div className="login-form-card"><div className="login-welcome"><span className="login-welcome-icon"><KeyRound size={20}/></span><p>التحقق بخطوتين</p><h2>أكمل تسجيل الدخول</h2><small>أدخل رمز تطبيق المصادقة أو رمز استرداد لمرة واحدة.</small></div>{error && <div className="login-error" role="alert">{error}</div>}<form action={verifyTwoFactorAction} className="login-form"><label>رمز التحقق أو الاسترداد<span><input name="code" autoComplete="one-time-code" autoFocus required maxLength={32} placeholder="000000 أو XXXX-XXXX-XXXX"/></span></label><button type="submit" className="login-submit">تحقق وتابع</button></form><form action={cancelTwoFactorAction} style={{marginTop:12}}><button type="submit" className="preview-submit" style={{width:'100%'}}>إلغاء والعودة للدخول</button></form><p className="login-privacy">استخدم رمزًا واحدًا فقط. رموز الاسترداد تُستهلك بعد استخدامها.</p><Link href="/login?role=admin" className="register-prompt">العودة إلى تسجيل الدخول</Link></div></section></main>
}

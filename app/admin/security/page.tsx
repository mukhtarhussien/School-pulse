import Link from 'next/link'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { guardAdmin } from '@/lib/admin'
import { buildTotpUri, decryptTotpSecret } from '@/lib/totp'
import { beginTotpSetupAction } from '@/app/admin/actions'
import TotpManagement from './totp-management'
import '../admin.css'

export const metadata = { title: 'أمان الحساب الإداري' }
export const instant = false

export default async function AdminSecurityPage() {
  const admin = await guardAdmin({ allowUnconfigured: true })
  const secret = admin.twoFactorEnabled ? null : decryptTotpSecret(admin.twoFactorSecretEncrypted)
  const uri = secret ? buildTotpUri(secret, admin.email) : null

  return <main className="admin-page" dir="rtl">
    <div className="admin-container">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark">م</span><span><strong>إدارة مدارس</strong><small>حماية حساب المسؤول</small></span></Link>
        <nav className="admin-nav" aria-label="التنقل الإداري"><Link href="/admin"><ArrowRight size={15}/> العودة للوحة الإدارة</Link></nav>
      </header>
      <section className="admin-heading"><div><span className="admin-eyebrow">أمان الحساب</span><h1>المصادقة الثنائية</h1><p>استخدم تطبيق مصادقة لحماية أدوات الإدارة والبيانات المدرسية.</p></div><ShieldCheck size={30} color="#176c5b"/></section>

      {!admin.twoFactorEnabled ? <div className="admin-security-grid">
        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>تفعيل المصادقة الثنائية</h2><p>أضف الحساب يدويًا في تطبيق المصادقة باستخدام المفتاح التالي.</p></div><KeyRound size={19} color="#598575"/></div>
          {!secret ? <><div className="admin-note admin-warning">يلزم تفعيل المصادقة الثنائية قبل فتح لوحة الإدارة.</div><form action={beginTotpSetupAction} style={{marginTop:14}}><button className="admin-btn" type="submit">بدء الإعداد</button></form></> : <>
            <div className="admin-note">افتح Google Authenticator أو Microsoft Authenticator واختر إضافة حساب يدويًا. أدخل اسم الحساب والبريد ثم هذا المفتاح.</div>
            <p className="admin-eyebrow" style={{marginTop:16}}>مفتاح الإعداد</p><code className="admin-secret">{secret}</code>
            {uri && <p className="admin-muted" style={{fontSize:11,lineHeight:1.8}}>يمكن استخدام رابط الإعداد في تطبيقات المصادقة التي تدعم الإدخال عبر الرابط:<br/><code dir="ltr" style={{overflowWrap:'anywhere'}}>{uri}</code></p>}
            <TotpManagement mode="setup"/>
          </>}
        </section>
        <aside className="admin-panel"><h2>قبل المتابعة</h2><p className="admin-note" style={{marginTop:12}}>بعد إدخال رمز التحقق، احفظ رموز الاسترداد في مكان آمن. كل رمز يُستخدم مرة واحدة لاستعادة الدخول.</p><p className="admin-note" style={{marginTop:10}}>لا تشارك المفتاح أو رموز الاسترداد مع أي شخص. من يملكها يستطيع تجاوز خطوة المصادقة.</p></aside>
      </div> : <div className="admin-security-grid">
        <section className="admin-panel"><div className="admin-panel-head"><div><h2>حسابك محمي</h2><p>المصادقة الثنائية مفعّلة على حساب {admin.email}.</p></div><ShieldCheck size={21} color="#176c5b"/></div><div className="admin-note">سيُطلب منك رمز من تطبيق المصادقة عند تسجيل الدخول. احتفظ برموز الاسترداد خارج هذا الجهاز.</div><TotpManagement mode="manage"/></section>
        <aside className="admin-panel"><h2>معلومات الحماية</h2><p className="admin-note" style={{marginTop:12}}>تتطلب واجهة الإدارة تفعيل المصادقة الثنائية، بما فيها واجهة الإدارة عبر التطبيق.</p><p className="admin-note" style={{marginTop:10}}>إذا فقدت الوصول إلى تطبيق المصادقة، استخدم أحد رموز الاسترداد التي حفظتها عند الإعداد.</p></aside>
      </div>}
      <footer className="admin-footer">تشفير أسرار المصادقة مرتبط بإعداد سر الجلسات في الخادم.</footer>
    </div>
  </main>
}

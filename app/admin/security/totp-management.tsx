'use client'

import { useActionState } from 'react'
import {
  confirmTotpSetupAction,
  disableTotpAction,
  regenerateRecoveryCodesAction,
} from '@/app/admin/actions'

type State = { ok?: boolean; error?: string; recoveryCodes?: string[] }

export default function TotpManagement({ mode }: { mode: 'setup' | 'manage' }) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmTotpSetupAction, {} as State)
  const [regenState, regenAction, regenerating] = useActionState(regenerateRecoveryCodesAction, {} as State)
  const [disableState, disableAction, disabling] = useActionState(disableTotpAction, {} as State)
  const recoveryCodes = confirmState.recoveryCodes || regenState.recoveryCodes

  return <div style={{marginTop:18}}>
    {mode === 'setup' ? <form action={confirmAction} className="admin-form" style={{marginTop:16}}>
      <label>رمز التحقق من التطبيق<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" dir="ltr"/></label>
      <button className="admin-btn" type="submit" disabled={confirming}>{confirming ? 'جارٍ التحقق…' : 'تأكيد وتفعيل المصادقة'}</button>
      {confirmState.error && <p className="admin-note admin-warning" role="alert">{confirmState.error}</p>}
    </form> : <>
      <form action={regenAction} className="admin-form" style={{marginTop:16}}>
        <label>تجديد رموز الاسترداد<input name="password" type="password" autoComplete="current-password" required placeholder="كلمة المرور الحالية"/></label>
        <label>رمز المصادقة الحالي<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" dir="ltr"/></label>
        <button className="admin-btn secondary" type="submit" disabled={regenerating}>{regenerating ? 'جارٍ التجديد…' : 'إنشاء رموز استرداد جديدة'}</button>
        {regenState.error && <p className="admin-note admin-warning" role="alert">{regenState.error}</p>}
      </form>
      <form action={disableAction} className="admin-form" style={{marginTop:18,paddingTop:17,borderTop:'1px solid #edf0ed'}}>
        <strong style={{fontSize:12}}>إيقاف المصادقة الثنائية</strong>
        <label>كلمة المرور الحالية<input name="password" type="password" autoComplete="current-password" required/></label>
        <label>رمز المصادقة الحالي<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required dir="ltr"/></label>
        <button className="admin-btn secondary" type="submit" disabled={disabling}>{disabling ? 'جارٍ الإيقاف…' : 'إيقاف المصادقة الثنائية'}</button>
        {disableState.error && <p className="admin-note admin-warning" role="alert">{disableState.error}</p>}
        {disableState.ok && <p className="admin-note" role="status">تم إيقاف المصادقة. سيُطلب إعدادها مجددًا قبل العودة للوحة الإدارة.</p>}
      </form>
    </>}
    {recoveryCodes && <section className="admin-note" role="status" style={{marginTop:14}}><strong>احفظ هذه الرموز الآن؛ لن تظهر مرة ثانية.</strong><div className="admin-code-grid">{recoveryCodes.map(code => <code className="admin-code" key={code}>{code}</code>)}</div></section>}
  </div>
}

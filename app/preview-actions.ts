'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { clearSession } from '@/lib/auth'

export async function startPreview() {
  if (process.env.NODE_ENV === 'production') redirect('/login')
  const store = await cookies()
  store.set('school_pulse_preview', '1', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 60 * 60 * 8 })
  redirect('/')
}

export async function stopPreview() {
  await clearSession()
  const store = await cookies()
  store.delete('school_pulse_preview')
  redirect('/login')
}

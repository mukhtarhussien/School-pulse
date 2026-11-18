import { LoginExperience } from '@/components/login-experience'

export const metadata = { title: 'دخول الحساب' }
type Role = 'student' | 'teacher' | 'admin'

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const query = await searchParams
  const candidate = typeof query.role === 'string' ? query.role : ''
  const error = typeof query.error === 'string' ? query.error : ''
  const role: Role = candidate === 'teacher' || candidate === 'admin' ? candidate : 'student'
  return <LoginExperience initialRole={role} error={error}/>
}

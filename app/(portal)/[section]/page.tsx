import { notFound } from 'next/navigation'

const sections = ['grades', 'assignments', 'attendance', 'calendar', 'notifications', 'messages', 'account']

export function generateStaticParams() { return sections.map(section => ({ section })) }

export default async function StudentSectionPage({ params }: PageProps<'/[section]'>) {
  const { section } = await params
  if (!sections.includes(section)) notFound()
  return null
}

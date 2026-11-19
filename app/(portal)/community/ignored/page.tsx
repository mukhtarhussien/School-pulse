import Link from 'next/link'
import { inArray } from 'drizzle-orm'
import { requireDb } from '@/db'
import { users } from '@/db/schema'
import { requireSchoolUser } from '@/lib/tenant'
import { unignoreCommunityAuthorAction } from '@/app/community/actions'

export default async function IgnoredCommunityPage() {
  const user = await requireSchoolUser()
  const ids = user.preferences?.ignoredUserIds ?? []
  const ignored = ids.length ? await requireDb().select({ id: users.id, name: users.fullNameAr }).from(users).where(inArray(users.id, ids)) : []
  return <section className="panel official-list"><header><h2>الحسابات المتجاهلة</h2><Link href="/community">رجوع للمجتمع</Link></header>{ignored.length ? ignored.map(author => <article className="community-ignored-row" key={author.id}><b>{author.name}</b><form action={unignoreCommunityAuthorAction}><input type="hidden" name="authorId" value={author.id}/><button className="secondary-btn">إلغاء التجاهل</button></form></article>) : <p className="official-empty">ما تجاهلت أي حساب.</p>}</section>
}

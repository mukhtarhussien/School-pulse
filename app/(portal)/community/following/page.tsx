import Link from 'next/link'
import { inArray } from 'drizzle-orm'
import { requireDb } from '@/db'
import { users } from '@/db/schema'
import { requireSchoolUser } from '@/lib/tenant'
import { unfollowCommunityAuthorAction } from '@/app/community/actions'

export default async function FollowedCommunityPage() {
  const user = await requireSchoolUser()
  const ids = user.preferences?.followedUserIds ?? []
  const followed = ids.length ? await requireDb().select({ id: users.id, name: users.fullNameAr }).from(users).where(inArray(users.id, ids)) : []
  return <section className="panel official-list"><header><h2>الحسابات التي تتابعها</h2><Link href="/community">رجوع للمجتمع</Link></header>{followed.length ? followed.map(author => <article className="community-ignored-row" key={author.id}><b>{author.name}</b><form action={unfollowCommunityAuthorAction}><input type="hidden" name="authorId" value={author.id}/><button className="secondary-btn">إلغاء المتابعة</button></form></article>) : <p className="official-empty">ما تتابع أي حساب حاليًا.</p>}</section>
}

import Link from 'next/link'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { requireDb } from '@/db'
import { communityComments, communityPostVotes, communityPosts } from '@/db/schema'
import { isSocialEnabled, requireSchoolUser } from '@/lib/tenant'


export const instant = false

export default async function CommunityActivityPage() {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) return <section className="panel"><h2>المجتمع متوقف</h2><p>فعّل المشاركة الاجتماعية من إعدادات الحساب حتى تشوف نشاطك المحفوظ.</p><Link href="/account">إعدادات المشاركة</Link></section>
  const db = requireDb()
  const authored = await db.select({ id: communityPosts.id, title: communityPosts.title, body: communityPosts.body, createdAt: communityPosts.createdAt }).from(communityPosts).where(and(eq(communityPosts.authorId, user.id), eq(communityPosts.published, true))).orderBy(desc(communityPosts.createdAt)).limit(40)
  const [voteRows, commentRows] = await Promise.all([
    db.select({ postId: communityPostVotes.postId }).from(communityPostVotes).where(eq(communityPostVotes.userId, user.id)),
    db.select({ postId: communityComments.postId }).from(communityComments).where(eq(communityComments.authorId, user.id)),
  ])
  const interactedIds = [...new Set([...voteRows, ...commentRows].map(row => row.postId))]
  const interacted = interactedIds.length ? await db.select({ id: communityPosts.id, title: communityPosts.title, body: communityPosts.body, createdAt: communityPosts.createdAt }).from(communityPosts).where(and(eq(communityPosts.published, true), or(eq(communityPosts.schoolId, user.schoolId), eq(communityPosts.scope, 'platform')), inArray(communityPosts.id, interactedIds))).orderBy(desc(communityPosts.createdAt)).limit(40) : []
  const posts = [...new Map([...authored, ...interacted].map(post => [post.id, post])).values()].sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())
  const ids = authored.map(post => post.id)
  const interactionCounts = ids.length ? await db.select({ postId: communityComments.postId }).from(communityComments).where(inArray(communityComments.postId, ids)) : []
  return <section className="panel"><header className="panel-head"><div><h2>تفاعلاتي</h2><p>منشوراتك والمنشورات التي تفاعلت معها.</p></div><Link href="/community">رجوع للمجتمع</Link></header><div className="community-feed">{posts.map(post => <article className="community-comment" key={post.id}><b>{post.title || 'منشور بدون عنوان'}</b><span>{post.body}</span><small>{new Intl.DateTimeFormat('ar-IQ', { dateStyle:'medium' }).format(post.createdAt)} · {interactionCounts.filter(item => item.postId === post.id).length} تعليق على منشوراتك</small></article>)}{posts.length === 0 && <p>ماكو تفاعلات بعد.</p>}</div></section>
}

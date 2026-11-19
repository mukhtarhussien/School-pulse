import Link from 'next/link'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { MessageCircle, ArrowBigDown, ArrowBigUp, Globe2, School, EyeOff, Flag, UserPlus, UserCheck } from 'lucide-react'
import { requireDb } from '@/db'
import { communityComments, communityPostVotes, communityPosts, schools, users } from '@/db/schema'
import { isSocialEnabled, requireSchoolUser } from '@/lib/tenant'
import {
  createCommunityCommentAction,
  createCommunityPostAction,
  voteCommunityPostAction,
  toggleIgnoreCommunityAuthorAction,
  toggleCommunityFollowAction,
  reportCommunityPostAction,
} from '@/app/community/actions'

export const instant = false

export default async function CommunityPage({ searchParams }: PageProps<'/community'>) {
  const query = await searchParams
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) return <section className="panel"><h2>المجتمع متوقف</h2><p>تقدر تفعّله من إعدادات الحساب. منشوراتك وتفاعلاتك محفوظة.</p><Link href="/account">إعدادات المشاركة</Link></section>
  const db = requireDb()
  const ignoredUserIds = user.preferences?.ignoredUserIds ?? []
  const followedUserIds = user.preferences?.followedUserIds ?? []
  const feed = await db.select({ id: communityPosts.id, title: communityPosts.title, body: communityPosts.body, scope: communityPosts.scope, createdAt: communityPosts.createdAt, schoolId: communityPosts.schoolId, authorId: users.id, author: users.fullNameAr, authorSchool: schools.nameAr, authorPreferences: users.preferences }).from(communityPosts).innerJoin(users, eq(users.id, communityPosts.authorId)).leftJoin(schools, eq(schools.id, users.schoolId)).where(and(eq(communityPosts.published, true), eq(users.isActive, true), or(eq(communityPosts.scope, 'platform'), eq(communityPosts.schoolId, user.schoolId)))).orderBy(desc(communityPosts.pinned), desc(communityPosts.createdAt)).limit(100)
  const visiblePosts = feed.filter(post => post.authorPreferences?.socialEnabled !== false && !ignoredUserIds.includes(post.authorId)).sort((a, b) => Number(followedUserIds.includes(b.authorId)) - Number(followedUserIds.includes(a.authorId)) || b.createdAt.getTime() - a.createdAt.getTime())
  const ids = visiblePosts.map(post => post.id)
  const [comments, votes] = ids.length ? await Promise.all([
    db.select({ postId: communityComments.postId, body: communityComments.body, createdAt: communityComments.createdAt, author: users.fullNameAr, preferences: users.preferences }).from(communityComments).innerJoin(users, eq(users.id, communityComments.authorId)).where(and(eq(communityComments.published, true), eq(users.isActive, true), inArray(communityComments.postId, ids))).orderBy(desc(communityComments.createdAt)),
    db.select({ postId: communityPostVotes.postId, userId: communityPostVotes.userId, value: communityPostVotes.value, preferences: users.preferences }).from(communityPostVotes).innerJoin(users, eq(users.id, communityPostVotes.userId)).where(and(inArray(communityPostVotes.postId, ids), eq(users.isActive, true))),
  ]) : [[], []]
  return <section className="community-page">
    <header className="panel-head"><div><h2>مجتمع مدارس</h2><p>شارك أفكارك وتواصل مع أفراد مجتمعك المدرسي.</p></div><div className="community-header-links"><Link href="/community/activity">تفاعلاتي</Link><Link href="/community/ignored">الحسابات المتجاهلة</Link><Link href="/community/following">الحسابات المتابَعة</Link></div></header>
    {query.reported === '1' && <p className="community-feedback" role="status">تم إرسال البلاغ إلى إدارة المنصة.</p>}{query.error === 'report_limit' && <p className="community-feedback community-feedback-error" role="alert">وصلت للحد اليومي للبلاغات. حاول غدًا.</p>}<form action={createCommunityPostAction} className="community-compose"><input name="title" maxLength={180} placeholder="عنوان المنشور (اختياري)"/><textarea name="body" required maxLength={5000} placeholder="اكتب منشورك..."/><div><select name="scope" defaultValue="school"><option value="school">مدرستي</option><option value="platform">كل المنصة</option></select><button className="primary-btn">نشر</button></div></form>
    <div className="community-feed">{visiblePosts.map(post => {
      const postVotes = votes.filter(vote => vote.postId === post.id && vote.preferences?.socialEnabled !== false)
      const postComments = comments.filter(comment => comment.postId === post.id && comment.preferences?.socialEnabled !== false)
      const isIgnored = ignoredUserIds.includes(post.authorId)
      const isFollowed = followedUserIds.includes(post.authorId)
      const ownPost = post.authorId === user.id
      return <article className="panel community-post" key={post.id}>
        <div className="community-post-controls" aria-label={`إجراءات منشور ${post.author}`}>
          <form action={toggleIgnoreCommunityAuthorAction}><input type="hidden" name="postId" value={post.id}/><button type="submit" disabled={ownPost} aria-pressed={isIgnored} title="إخفاء منشورات هذا الحساب"><EyeOff size={15}/><span>{isIgnored ? 'إلغاء التجاهل' : 'تجاهل الحساب'}</span></button></form>
          <form action={reportCommunityPostAction}><input type="hidden" name="postId" value={post.id}/><button type="submit" title="إبلاغ عن المنشور"><Flag size={15}/><span>إبلاغ</span></button></form>
          <form action={toggleCommunityFollowAction}><input type="hidden" name="postId" value={post.id}/><button type="submit" disabled={ownPost} aria-pressed={isFollowed} title="متابعة صاحب المنشور">{isFollowed ? <UserCheck size={15}/> : <UserPlus size={15}/>}<span>{isFollowed ? 'إلغاء المتابعة' : 'متابعة الحساب'}</span></button></form>
        </div>
        <div className="community-post-head"><span className="avatar">{post.author.slice(0, 1)}</span><div><b>{post.author}</b><small>{post.scope === 'school' ? 'مجتمع المدرسة' : `من مدرسة ${post.authorSchool ?? 'غير معروفة'}`} · {new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(post.createdAt)}</small></div><span>{post.scope === 'school' ? <School size={16}/> : <Globe2 size={16}/>}</span></div>
        {post.title && <h3>{post.title}</h3>}<p>{post.body}</p>
        <div className="community-actions"><form action={voteCommunityPostAction}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="value" value="1"/><button aria-label="تصويت إيجابي"><ArrowBigUp size={18}/></button></form><b>{postVotes.reduce((sum, vote) => sum + vote.value, 0)}</b><form action={voteCommunityPostAction}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="value" value="-1"/><button aria-label="تصويت سلبي"><ArrowBigDown size={18}/></button></form><span><MessageCircle size={16}/> {postComments.length} تعليق</span></div>
        {postComments.map((comment, index) => <div className="community-comment" key={`${post.id}-${index}`}><b>{comment.author}</b><span>{comment.body}</span></div>)}
        <form action={createCommunityCommentAction} className="community-comment-form"><input type="hidden" name="postId" value={post.id}/><input name="body" required maxLength={3000} placeholder="اكتب تعليقًا..."/><button>إرسال</button></form>
      </article>
    })}{visiblePosts.length === 0 && <div className="panel"><p>لا توجد منشورات لعرضها حاليًا.</p></div>}</div>
  </section>
}

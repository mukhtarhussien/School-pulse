'use server'

import { and, eq, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireDb } from '@/db'
import { communityComments, communityPostVotes, communityPosts, platformReports, users } from '@/db/schema'
import { hasReachedDailyReportLimit } from '@/lib/platform-reports'
import { isSocialEnabled, requireSchoolUser } from '@/lib/tenant'

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

export async function createCommunityPostAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const body = text(fd, 'body')
  const title = text(fd, 'title')
  const scope = text(fd, 'scope') === 'platform' ? 'platform' : 'school'
  if (!body || body.length > 5000 || title.length > 180) redirect('/community?error=post')
  await requireDb().insert(communityPosts).values({
    authorId: user.id,
    schoolId: scope === 'school' ? user.schoolId : null,
    scope,
    title: title || null,
    body,
    published: true,
    pinned: false,
  })
  revalidatePath('/community')
}

export async function createCommunityCommentAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const postId = text(fd, 'postId')
  const body = text(fd, 'body')
  if (!body || body.length > 3000) redirect('/community?error=comment')
  const [post] = await requireDb().select({ id: communityPosts.id }).from(communityPosts).where(and(
    eq(communityPosts.id, postId), eq(communityPosts.published, true),
    or(eq(communityPosts.scope, 'platform'), eq(communityPosts.schoolId, user.schoolId)),
  )).limit(1)
  if (!post) redirect('/community')
  await requireDb().insert(communityComments).values({ postId, authorId: user.id, body, published: true })
  revalidatePath('/community')
}

export async function voteCommunityPostAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const postId = text(fd, 'postId')
  const value = Number(text(fd, 'value'))
  if (value !== 1 && value !== -1) redirect('/community')
  const db = requireDb()
  const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(
    eq(communityPosts.id, postId), eq(communityPosts.published, true),
    or(eq(communityPosts.scope, 'platform'), eq(communityPosts.schoolId, user.schoolId)),
  )).limit(1)
  if (!post) redirect('/community')
  const [existing] = await db.select({ id: communityPostVotes.id, value: communityPostVotes.value }).from(communityPostVotes).where(and(eq(communityPostVotes.postId, postId), eq(communityPostVotes.userId, user.id))).limit(1)
  if (!existing) await db.insert(communityPostVotes).values({ postId, userId: user.id, value })
  else if (existing.value === value) await db.delete(communityPostVotes).where(eq(communityPostVotes.id, existing.id))
  else await db.update(communityPostVotes).set({ value }).where(eq(communityPostVotes.id, existing.id))
  revalidatePath('/community')
}

async function visiblePostAuthor(postId: string, schoolId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)) return null
  const [post] = await requireDb().select({ id: communityPosts.id, authorId: communityPosts.authorId })
    .from(communityPosts)
    .where(and(
      eq(communityPosts.id, postId),
      eq(communityPosts.published, true),
      or(eq(communityPosts.scope, 'platform'), eq(communityPosts.schoolId, schoolId)),
    )).limit(1)
  return post ?? null
}

export async function toggleIgnoreCommunityAuthorAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const postId = text(fd, 'postId')
  const post = await visiblePostAuthor(postId, user.schoolId)
  if (!post || post.authorId === user.id) redirect('/community')
  const current = user.preferences?.ignoredUserIds ?? []
  const ignored = current.includes(post.authorId)
    ? current.filter(id => id !== post.authorId)
    : [...current, post.authorId].slice(-500)
  await requireDb().update(users).set({ preferences: { ...(user.preferences ?? {}), ignoredUserIds: ignored }, updatedAt: new Date() }).where(eq(users.id, user.id))
  revalidatePath('/community')
}

export async function toggleCommunityFollowAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const postId = text(fd, 'postId')
  const post = await visiblePostAuthor(postId, user.schoolId)
  if (!post || post.authorId === user.id) redirect('/community')
  const current = user.preferences?.followedUserIds ?? []
  const followed = current.includes(post.authorId)
    ? current.filter(id => id !== post.authorId)
    : [...current, post.authorId].slice(-500)
  await requireDb().update(users).set({ preferences: { ...(user.preferences ?? {}), followedUserIds: followed }, updatedAt: new Date() }).where(eq(users.id, user.id))
  revalidatePath('/community')
}

export async function reportCommunityPostAction(fd: FormData) {
  const user = await requireSchoolUser()
  if (!isSocialEnabled(user)) redirect('/account?social=off')
  const postId = text(fd, 'postId')
  const [post] = await requireDb().select({ id: communityPosts.id, authorId: communityPosts.authorId, title: communityPosts.title, body: communityPosts.body })
    .from(communityPosts)
    .where(and(
      eq(communityPosts.id, postId),
      eq(communityPosts.published, true),
      or(eq(communityPosts.scope, 'platform'), eq(communityPosts.schoolId, user.schoolId)),
    )).limit(1)
  if (!post) redirect('/community')
  if (await hasReachedDailyReportLimit(user.id)) redirect('/community?error=report_limit')
  await requireDb().insert(platformReports).values({
    reporterId: user.id,
    category: 'abuse',
    subject: 'بلاغ عن منشور في المجتمع',
    message: `Post ID: ${post.id}\nAuthor ID: ${post.authorId}\nTitle: ${(post.title ?? '').slice(0, 180)}\nContent: ${post.body.slice(0, 4500)}`,
  })
  revalidatePath('/admin/mangep')
  redirect('/community?reported=1')
}

export async function unignoreCommunityAuthorAction(fd: FormData) {
  const user = await requireSchoolUser()
  const authorId = text(fd, 'authorId')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authorId)) redirect('/community/ignored')
  const ignored = (user.preferences?.ignoredUserIds ?? []).filter(id => id !== authorId)
  await requireDb().update(users).set({ preferences: { ...(user.preferences ?? {}), ignoredUserIds: ignored }, updatedAt: new Date() }).where(eq(users.id, user.id))
  revalidatePath('/community')
  revalidatePath('/community/ignored')
}

export async function unfollowCommunityAuthorAction(fd: FormData) {
  const user = await requireSchoolUser()
  const authorId = text(fd, 'authorId')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authorId)) redirect('/community/following')
  const followed = (user.preferences?.followedUserIds ?? []).filter(id => id !== authorId)
  await requireDb().update(users).set({ preferences: { ...(user.preferences ?? {}), followedUserIds: followed }, updatedAt: new Date() }).where(eq(users.id, user.id))
  revalidatePath('/community')
  revalidatePath('/community/following')
}

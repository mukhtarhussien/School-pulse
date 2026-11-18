'use server'

import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireDb } from '@/db'
import { communityComments, communityPostVotes, communityPosts } from '@/db/schema'
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

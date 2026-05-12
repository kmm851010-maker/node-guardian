export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  const username = searchParams.get('username') ?? ''
  const since = searchParams.get('since') ?? '1970-01-01T00:00:00.000Z'

  if (!pi_uid) return NextResponse.json({ hasNew: false })

  // 내 글에 달린 새 댓글
  const { data: myPosts } = await supabaseServer
    .from('pilink_posts')
    .select('id')
    .or(`author_uid.eq.${pi_uid},author_uid.eq.${username}`)

  const postIds = (myPosts ?? []).map((p: any) => p.id)
  let hasNewOnPosts = false
  if (postIds.length > 0) {
    const { count } = await supabaseServer
      .from('post_comments')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds)
      .gt('created_at', since)
      .neq('author_uid', pi_uid)
      .neq('author_uid', username)
    hasNewOnPosts = (count ?? 0) > 0
  }

  // 내 댓글에 달린 새 대댓글
  const { data: myComments } = await supabaseServer
    .from('post_comments')
    .select('id')
    .or(`author_uid.eq.${pi_uid},author_uid.eq.${username}`)

  const commentIds = (myComments ?? []).map((c: any) => c.id)
  let hasNewReplies = false
  if (commentIds.length > 0) {
    const { count } = await supabaseServer
      .from('post_comments')
      .select('id', { count: 'exact', head: true })
      .in('parent_id', commentIds)
      .gt('created_at', since)
      .neq('author_uid', pi_uid)
      .neq('author_uid', username)
    hasNewReplies = (count ?? 0) > 0
  }

  return NextResponse.json({ hasNew: hasNewOnPosts || hasNewReplies })
}

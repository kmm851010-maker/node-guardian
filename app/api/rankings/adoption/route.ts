export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  // 채택된 댓글 ID 목록 조회
  const { data: posts, error: postsError } = await supabaseServer
    .from('pilink_posts')
    .select('best_answer_comment_id')
    .not('best_answer_comment_id', 'is', null)

  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 })

  const commentIds = (posts ?? []).map((p: any) => p.best_answer_comment_id as string)
  if (!commentIds.length) return NextResponse.json({ ranking: [] })

  // 채택된 댓글의 작성자 조회
  const { data: comments, error: commentsError } = await supabaseServer
    .from('post_comments')
    .select('id, author_uid, nickname')
    .in('id', commentIds)

  if (commentsError) return NextResponse.json({ error: commentsError.message }, { status: 500 })

  // author_uid별 채택 수 집계
  const countMap: Record<string, { nickname: string; count: number }> = {}
  for (const c of comments ?? []) {
    if (!countMap[c.author_uid]) countMap[c.author_uid] = { nickname: c.nickname, count: 0 }
    countMap[c.author_uid].count++
  }

  // 프로필 조회
  const uids = Object.keys(countMap)
  const { data: profiles } = uids.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name').in('pi_uid', uids)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.pi_uid, p]))

  const ranking = Object.entries(countMap)
    .map(([pi_uid, { nickname, count }]) => ({
      pi_uid,
      nickname: profileMap[pi_uid]?.nickname ?? nickname,
      display_name: profileMap[pi_uid]?.display_name ?? null,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  return NextResponse.json({ ranking })
}

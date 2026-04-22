export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params

  // 게시글 및 받은 좋아요 수
  const { data: posts } = await supabaseServer
    .from('pilink_posts')
    .select('id, title, post_type, likes, created_at')
    .eq('author_uid', uid)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: totalLikesData } = await supabaseServer
    .from('pilink_posts')
    .select('likes')
    .eq('author_uid', uid)

  const totalLikes = (totalLikesData ?? []).reduce((sum, p) => sum + (p.likes ?? 0), 0)

  // 닉네임
  const nickname = posts?.[0]?.title ? null : null
  const { data: nodeData } = await supabaseServer
    .from('node_status')
    .select('nickname, process_status, port_status, last_seen')
    .eq('pi_uid', uid)
    .maybeSingle()

  // 주간 랭킹 기록 (최근 4주)
  const { data: rankHistory } = await supabaseServer
    .from('weekly_rankings')
    .select('week_start, rank, total_likes')
    .eq('pi_uid', uid)
    .order('week_start', { ascending: false })
    .limit(4)

  return NextResponse.json({
    pi_uid: uid,
    nickname: nodeData?.nickname ?? null,
    nodeStatus: nodeData ?? null,
    recentPosts: posts ?? [],
    totalLikes,
    rankHistory: rankHistory ?? [],
  })
}

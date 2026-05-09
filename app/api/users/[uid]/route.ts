export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params
  const nicknameParam = new URL(req.url).searchParams.get('nickname')

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

  const { data: nodeData } = await supabaseServer
    .from('node_status')
    .select('nickname, process_status, port_status, last_seen')
    .eq('pi_uid', uid)
    .maybeSingle()

  let profileData: { display_name: string | null; avatar_url: string | null; nickname: string | null } | null = null
  const { data: profileByUid } = await supabaseServer
    .from('node_profiles')
    .select('display_name, avatar_url, nickname')
    .eq('pi_uid', uid)
    .maybeSingle()
  if (profileByUid) {
    profileData = profileByUid
  } else {
    // fallback: try by nodeData.nickname, then by provided nickname param
    const fallbackNick = nodeData?.nickname ?? nicknameParam
    if (fallbackNick) {
      const { data: profileByNick } = await supabaseServer
        .from('node_profiles')
        .select('display_name, avatar_url, nickname')
        .eq('nickname', fallbackNick)
        .maybeSingle()
      profileData = profileByNick
    }
  }

  // 주간 랭킹 기록 (최근 4주)
  const { data: rankHistory } = await supabaseServer
    .from('weekly_rankings')
    .select('week_start, rank, total_likes')
    .eq('pi_uid', uid)
    .order('week_start', { ascending: false })
    .limit(4)

  return NextResponse.json({
    pi_uid: uid,
    nickname: profileData?.nickname ?? nodeData?.nickname ?? null,
    display_name: profileData?.display_name ?? null,
    avatar_url: profileData?.avatar_url ?? null,
    nodeStatus: nodeData ?? null,
    recentPosts: posts ?? [],
    totalLikes,
    rankHistory: rankHistory ?? [],
  })
}

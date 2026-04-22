export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 전체 노드 현황 조회 (랭킹, 대시보드용)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')

  if (pi_uid) {
    // pi_uid로 먼저 조회, 없으면 nickname(username)으로 조회
    const { data, error } = await supabaseServer
      .from('node_status')
      .select('*')
      .eq('pi_uid', pi_uid)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (data) return NextResponse.json({ data })

    // Pi SDK uid로 못 찾으면 username(nickname)으로 재조회
    const username = searchParams.get('username')
    if (username) {
      const { data: data2, error: error2 } = await supabaseServer
        .from('node_status')
        .select('*')
        .eq('nickname', username)
        .order('last_seen', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      return NextResponse.json({ data: data2 ?? null })
    }

    return NextResponse.json({ data: null })
  }

  // 전체 운영자 상태 (last_seen 기준 정렬)
  const { data, error } = await supabaseServer
    .from('node_status')
    .select('*')
    .order('last_seen', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

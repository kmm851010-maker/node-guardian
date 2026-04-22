export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 전체 노드 현황 조회 (랭킹, 대시보드용)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')

  if (pi_uid) {
    // 특정 운영자 상태
    const { data, error } = await supabaseServer
      .from('node_status')
      .select('*')
      .eq('pi_uid', pi_uid)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? null })
  }

  // 전체 운영자 상태 (last_seen 기준 정렬)
  const { data, error } = await supabaseServer
    .from('node_status')
    .select('*')
    .order('last_seen', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

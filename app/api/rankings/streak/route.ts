export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function assignRanks<T>(sorted: T[], getVal: (x: T) => number, maxRank: number): (T & { rank: number })[] {
  const result: (T & { rank: number })[] = []
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && getVal(sorted[i]) < getVal(sorted[i - 1])) rank = i + 1
    if (rank > maxRank) break
    result.push({ ...sorted[i], rank })
  }
  return result
}

export async function GET() {
  // RPC: Supabase SQL 함수로 streak 집계 (max_rows 제한 없음)
  const { data: streaks, error } = await supabaseServer.rpc('get_attendance_streaks')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 프로필 조회
  const uids = (streaks ?? []).map((s: any) => s.pi_uid)
  const { data: profiles } = uids.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name').in('pi_uid', uids)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.pi_uid, p]))

  const enriched = (streaks ?? []).map((s: any) => ({
    pi_uid: s.pi_uid,
    current: s.current_streak,
    max: s.max_streak,
    nickname: profileMap[s.pi_uid]?.nickname ?? s.pi_uid,
    display_name: profileMap[s.pi_uid]?.display_name ?? null,
  }))

  const currentRanking = assignRanks(
    enriched.filter(s => s.current > 0).sort((a, b) => b.current - a.current),
    x => x.current, 10
  )

  const maxRanking = assignRanks(
    enriched.filter(s => s.max > 0).sort((a, b) => b.max - a.max),
    x => x.max, 10
  )

  return NextResponse.json({ currentRanking, maxRanking })
}

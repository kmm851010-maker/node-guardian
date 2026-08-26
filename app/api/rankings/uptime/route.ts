export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const myUid = searchParams.get('my_uid')

  const { data, error } = await supabaseServer
    .from('node_status')
    .select('pi_uid, nickname, uptime_7d, uptime_30d, uptime_start')
    .not('uptime_7d', 'is', null)
    .limit(50000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()

  // JS 정렬: 7일 가동률 → 30일 가동률 → 연속 가동일수 순
  const rows = (data ?? [])
    .map(r => ({
      ...r,
      streak_days: r.uptime_start
        ? Math.floor((now - new Date(r.uptime_start).getTime()) / 86400000)
        : 0,
    }))
    .sort((a, b) =>
      (b.uptime_7d  ?? 0) - (a.uptime_7d  ?? 0) ||
      (b.uptime_30d ?? 0) - (a.uptime_30d ?? 0) ||
      b.streak_days - a.streak_days
    )

  const total  = rows.length
  const avg7d  = total > 0 ? Math.round(rows.reduce((s, r) => s + (r.uptime_7d  ?? 0), 0) / total * 10) / 10 : null
  const avg30d = total > 0 ? Math.round(rows.reduce((s, r) => s + (r.uptime_30d ?? 0), 0) / total * 10) / 10 : null

  const rankings = rows.slice(0, 50).map((r, i) => ({
    rank:        i + 1,
    pi_uid:      r.pi_uid,
    nickname:    r.nickname,
    uptime_7d:   r.uptime_7d,
    uptime_30d:  r.uptime_30d,
    streak_days: r.streak_days,
  }))

  let my_rank:    number | null = null
  let my_top_pct: number | null = null

  if (myUid) {
    const idx = rows.findIndex(r => r.pi_uid === myUid)
    if (idx !== -1) {
      my_rank    = idx + 1
      my_top_pct = Math.ceil((my_rank / total) * 100)
    }
  }

  return NextResponse.json({ rankings, total, average_7d: avg7d, average_30d: avg30d, my_rank, my_top_pct })
}

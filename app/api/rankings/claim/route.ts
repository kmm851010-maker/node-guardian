export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 가장 최근에 발표된 주(지난주) 일요일 날짜
function getPrevWeekStart(): string {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const prevSun = new Date(nowKST.getTime() - day * 86400000 - 7 * 86400000)
  const y = prevSun.getUTCFullYear()
  const m = String(prevSun.getUTCMonth() + 1).padStart(2, '0')
  const d = String(prevSun.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// POST: 상금 수령 신청 (이번 주 유효한 클레임만)
export async function POST(req: NextRequest) {
  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const validWeek = getPrevWeekStart()

  const { data: entry, error } = await supabaseServer
    .from('weekly_rankings')
    .select('*')
    .eq('pi_uid', pi_uid)
    .eq('claimed', false)
    .eq('week_start', validWeek)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: '수령 가능한 상금이 없거나 기간이 만료됐습니다.' }, { status: 404 })

  const { error: updateError } = await supabaseServer
    .from('weekly_rankings')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', entry.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, rank: entry.rank, total_likes: entry.total_likes, week_start: entry.week_start })
}

// GET: 클레임 버튼 표시 여부 확인
// - 지난주 랭킹에 있고 미수령 → claimable: true (버튼 표시)
// - 지난주 랭킹에 있고 수령완료 → claimed: true (완료 표시)
// - 지난주 랭킹에 없음 → claimable: false (숨김)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ claimable: false })

  const validWeek = getPrevWeekStart()

  const { data } = await supabaseServer
    .from('weekly_rankings')
    .select('rank, total_likes, claimed, week_start')
    .eq('pi_uid', pi_uid)
    .eq('week_start', validWeek)
    .maybeSingle()

  if (!data) return NextResponse.json({ claimable: false })

  return NextResponse.json({
    claimable: !data.claimed,
    claimed: data.claimed,
    rank: data.rank,
    total_likes: data.total_likes,
    week_start: data.week_start,
  })
}

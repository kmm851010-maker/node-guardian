export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getPrevWeekStart(): string {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const prevSun = new Date(nowKST.getTime() - day * 86400000 - 7 * 86400000)
  const y = prevSun.getUTCFullYear()
  const m = String(prevSun.getUTCMonth() + 1).padStart(2, '0')
  const d = String(prevSun.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// POST: 프리미엄 1주일 즉시 부여
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
    .lte('rank', 10)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entry) return NextResponse.json({ error: '수령 가능한 보상이 없거나 기간이 만료됐습니다.' }, { status: 404 })

  // 기존 프리미엄 만료일 확인 (남아있으면 연장, 없으면 지금부터)
  const { data: existing } = await supabaseServer
    .from('premium_users')
    .select('expires_at')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  const base = existing?.expires_at && new Date(existing.expires_at) > new Date()
    ? new Date(existing.expires_at)
    : new Date()
  const expires_at = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: premiumError } = await supabaseServer
    .from('premium_users')
    .upsert({
      pi_uid,
      nickname: entry.nickname,
      payment_id: `ranking_${validWeek}_rank${entry.rank}`,
      amount_pi: 0,
      expires_at,
      canceled: false,
    }, { onConflict: 'pi_uid' })

  if (premiumError) return NextResponse.json({ error: premiumError.message }, { status: 500 })

  const { error: updateError } = await supabaseServer
    .from('weekly_rankings')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', entry.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, rank: entry.rank, expires_at, week_start: entry.week_start })
}

// GET: 클레임 버튼 표시 여부
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ claimable: false })

  const validWeek = getPrevWeekStart()

  const { data } = await supabaseServer
    .from('weekly_rankings')
    .select('rank, total_likes, best_answer_count, comment_count, view_score, claimed, week_start')
    .eq('pi_uid', pi_uid)
    .eq('week_start', validWeek)
    .lte('rank', 10)
    .maybeSingle()

  if (!data) return NextResponse.json({ claimable: false })

  return NextResponse.json({
    claimable: !data.claimed,
    claimed: data.claimed,
    rank: data.rank,
    total_likes: data.total_likes,
    best_answer_count: data.best_answer_count,
    comment_count: data.comment_count,
    view_score: data.view_score,
    week_start: data.week_start,
  })
}

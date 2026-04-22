export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getWeekBounds() {
  // 현재 주 일요일 00:00 KST 기준
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const sun = new Date(nowKST.getTime() - day * 86400000)
  const y = sun.getUTCFullYear()
  const m = sun.getUTCMonth()
  const d = sun.getUTCDate()

  // 일요일 00:00 KST = UTC - 9h
  const startUTC = new Date(Date.UTC(y, m, d, -9, 0, 0))
  // 토요일 23:59:59 KST = 7일 뒤 - 1초
  const endUTC = new Date(startUTC.getTime() + 7 * 86400000 - 1000)

  const weekStart = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { startUTC, endUTC, weekStart }
}

// Vercel cron (일요일 00:00 KST = UTC 15:00 전주) 또는 수동 호출
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { startUTC, endUTC, weekStart } = getWeekBounds()

  // 이미 계산된 주간 랭킹이 있으면 스킵
  const { data: existing } = await supabaseServer
    .from('weekly_rankings')
    .select('id')
    .eq('week_start', weekStart)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, message: 'Already calculated' })
  }

  // RPC로 랭킹 계산
  const { data: ranked, error } = await supabaseServer
    .rpc('calculate_weekly_ranking', {
      p_start: startUTC.toISOString(),
      p_end: endUTC.toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (ranked ?? []).map((r: { pi_uid: string; nickname: string; total_likes: number }, i: number) => ({
    week_start: weekStart,
    rank: i + 1,
    pi_uid: r.pi_uid,
    nickname: r.nickname,
    total_likes: Number(r.total_likes),
  }))

  if (rows.length === 0) return NextResponse.json({ ok: true, message: 'No likes this week' })

  const { error: insertError } = await supabaseServer
    .from('weekly_rankings')
    .insert(rows)

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length, weekStart })
}

// Vercel cron은 GET을 사용
export async function GET(req: NextRequest) {
  // Vercel cron 인증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { startUTC, endUTC, weekStart } = getWeekBounds()

  const { data: existing } = await supabaseServer
    .from('weekly_rankings')
    .select('id')
    .eq('week_start', weekStart)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, message: 'Already calculated' })
  }

  const { data: ranked, error } = await supabaseServer
    .rpc('calculate_weekly_ranking', {
      p_start: startUTC.toISOString(),
      p_end: endUTC.toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (ranked ?? []).map((r: { pi_uid: string; nickname: string; total_likes: number }, i: number) => ({
    week_start: weekStart,
    rank: i + 1,
    pi_uid: r.pi_uid,
    nickname: r.nickname,
    total_likes: Number(r.total_likes),
  }))

  if (rows.length === 0) return NextResponse.json({ ok: true, message: 'No likes this week' })

  const { error: insertError } = await supabaseServer
    .from('weekly_rankings')
    .insert(rows)

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length, weekStart })
}

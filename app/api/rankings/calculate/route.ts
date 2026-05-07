export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getWeekBounds() {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const sun = new Date(nowKST.getTime() - day * 86400000)
  const y = sun.getUTCFullYear()
  const m = sun.getUTCMonth()
  const d = sun.getUTCDate()

  const startUTC = new Date(Date.UTC(y, m, d, -9, 0, 0))
  const endUTC = new Date(startUTC.getTime() + 7 * 86400000 - 1000)
  const weekStart = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // 토요일 KST 날짜 문자열 (attendance 쿼리용)
  const satKST = new Date(startUTC.getTime() + 6 * 86400000 + 9 * 3600000)
  const weekEnd = `${satKST.getUTCFullYear()}-${String(satKST.getUTCMonth() + 1).padStart(2, '0')}-${String(satKST.getUTCDate()).padStart(2, '0')}`

  return { startUTC, endUTC, weekStart, weekEnd }
}

async function runCalculation(weekStart: string, weekEnd: string, startUTC: Date, endUTC: Date) {
  const { data: existing } = await supabaseServer
    .from('weekly_rankings')
    .select('id')
    .eq('week_start', weekStart)
    .limit(1)
  if (existing && existing.length > 0) return { ok: true, message: 'Already calculated' }

  // 좋아요 랭킹 (RPC)
  const { data: ranked, error } = await supabaseServer
    .rpc('calculate_weekly_ranking', {
      p_start: startUTC.toISOString(),
      p_end: endUTC.toISOString(),
    })
  if (error) return { error: error.message }

  // 주간 출석 XP
  const { data: weekAttendance } = await supabaseServer
    .from('attendance')
    .select('pi_uid, xp_earned')
    .gte('checked_date', weekStart)
    .lte('checked_date', weekEnd)

  const xpByUser: Record<string, number> = {}
  for (const row of weekAttendance ?? []) {
    xpByUser[row.pi_uid] = (xpByUser[row.pi_uid] ?? 0) + row.xp_earned
  }

  // 좋아요 없이 XP만 있는 유저 닉네임 조회
  const likedUids = new Set((ranked ?? []).map((r: { pi_uid: string }) => r.pi_uid))
  const xpOnlyUids = Object.keys(xpByUser).filter(uid => !likedUids.has(uid))

  const xpOnlyNicknames: Record<string, string> = {}
  if (xpOnlyUids.length > 0) {
    const { data: profiles } = await supabaseServer
      .from('node_profiles')
      .select('pi_uid, nickname')
      .in('pi_uid', xpOnlyUids)
    for (const p of profiles ?? []) xpOnlyNicknames[p.pi_uid] = p.nickname
  }

  // 전체 유저 합산 후 정렬 (score = total_likes + weekly_xp)
  const allUsers = [
    ...(ranked ?? []).map((r: { pi_uid: string; nickname: string; total_likes: number }) => ({
      pi_uid: r.pi_uid,
      nickname: r.nickname,
      total_likes: Number(r.total_likes),
      weekly_xp: xpByUser[r.pi_uid] ?? 0,
    })),
    ...xpOnlyUids.map(uid => ({
      pi_uid: uid,
      nickname: xpOnlyNicknames[uid] ?? uid,
      total_likes: 0,
      weekly_xp: xpByUser[uid],
    })),
  ]

  if (allUsers.length === 0) return { ok: true, message: 'No activity this week' }

  allUsers.sort((a, b) => (b.total_likes + b.weekly_xp) - (a.total_likes + a.weekly_xp))

  const rows = allUsers.map((u, i) => ({
    week_start: weekStart,
    rank: i + 1,
    pi_uid: u.pi_uid,
    nickname: u.nickname,
    total_likes: u.total_likes,
    // weekly_xp: u.weekly_xp, // TODO: 스키마 캐시 갱신 후 활성화
  }))

  const { error: insertError } = await supabaseServer.from('weekly_rankings').insert(rows)
  if (insertError) return { error: insertError.message }

  return { ok: true, count: rows.length, weekStart }
}

// 수동 호출 (POST)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { weekStart, weekEnd, startUTC, endUTC } = getWeekBounds()
  const result = await runCalculation(weekStart, weekEnd, startUTC, endUTC)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

// Vercel cron (GET)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { weekStart, weekEnd, startUTC, endUTC } = getWeekBounds()
  const result = await runCalculation(weekStart, weekEnd, startUTC, endUTC)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

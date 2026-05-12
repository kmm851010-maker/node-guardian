export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getTodayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function getYesterdayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000 - 86400000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function prevDay(dateStr: string): string {
  const dt = new Date(dateStr)
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function getWeekStartKST(): string {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const sun = new Date(nowKST.getTime() - day * 86400000)
  return `${sun.getUTCFullYear()}-${String(sun.getUTCMonth() + 1).padStart(2, '0')}-${String(sun.getUTCDate()).padStart(2, '0')}`
}

function calcStreaks(dates: string[]): { current: number; max: number } {
  if (!dates.length) return { current: 0, max: 0 }
  const sorted = [...new Set(dates)].sort()
  let max = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000)
    if (diff === 1) { run++; if (run > max) max = run }
    else run = 1
  }
  const today = getTodayKST()
  const yesterday = getYesterdayKST()
  const desc = [...sorted].reverse()
  const anchor = desc[0]
  if (anchor !== today && anchor !== yesterday) return { current: 0, max }
  let current = 0, expected = anchor
  for (const d of desc) {
    if (d === expected) { current++; expected = prevDay(expected) }
    else break
  }
  return { current, max }
}

export async function GET() {
  const weekStart = getWeekStartKST()
  const badgeMap: Record<string, string[]> = {}
  const addBadge = (uid: string, badge: string) => {
    if (!badgeMap[uid]) badgeMap[uid] = []
    if (!badgeMap[uid].includes(badge)) badgeMap[uid].push(badge)
  }

  const [
    { data: weeklyRankings },
    { data: attendanceRows },
    { data: adoptedPosts },
  ] = await Promise.all([
    // 주간 인기멤버 TOP3
    supabaseServer.from('weekly_rankings').select('pi_uid, rank').eq('week_start', weekStart).lte('rank', 3),
    // 출석 전체
    supabaseServer.from('attendance').select('pi_uid, checked_date').order('checked_date', { ascending: true }),
    // 채택된 글 전체
    supabaseServer.from('pilink_posts').select('best_answer_comment_id').not('best_answer_comment_id', 'is', null),
  ])

  // 주간 인기멤버 TOP3 → badge-trophy
  for (const r of weeklyRankings ?? []) addBadge(r.pi_uid, 'trophy')

  // 스트릭 계산
  const byUid: Record<string, string[]> = {}
  for (const row of attendanceRows ?? []) {
    if (!byUid[row.pi_uid]) byUid[row.pi_uid] = []
    byUid[row.pi_uid].push(row.checked_date)
  }
  const streaks = Object.entries(byUid).map(([pi_uid, dates]) => ({ pi_uid, ...calcStreaks(dates) }))

  // 현재 연속출석 TOP3 → badge-flame
  const flameTop = [...streaks].filter(s => s.current > 0).sort((a, b) => b.current - a.current).slice(0, 3)
  for (const s of flameTop) addBadge(s.pi_uid, 'flame')

  // 역대 최장출석 TOP5 → badge-crown
  const crownTop = [...streaks].filter(s => s.max > 0).sort((a, b) => b.max - a.max).slice(0, 5)
  for (const s of crownTop) addBadge(s.pi_uid, 'crown')

  // 채택 댓글 조회
  const commentIds = (adoptedPosts ?? []).map((p: any) => p.best_answer_comment_id as string)
  if (commentIds.length) {
    const { data: adoptedComments } = await supabaseServer
      .from('post_comments').select('id, author_uid, created_at').in('id', commentIds)

    // 역대 지식In TOP5 → badge-diamond
    const allTimeCount: Record<string, number> = {}
    for (const c of adoptedComments ?? []) allTimeCount[c.author_uid] = (allTimeCount[c.author_uid] ?? 0) + 1
    Object.entries(allTimeCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .forEach(([uid]) => addBadge(uid, 'diamond'))

    // 주간 지식In TOP3 → badge-scholar
    const weeklyCount: Record<string, number> = {}
    for (const c of adoptedComments ?? []) {
      if (c.created_at >= weekStart) weeklyCount[c.author_uid] = (weeklyCount[c.author_uid] ?? 0) + 1
    }
    Object.entries(weeklyCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .forEach(([uid]) => addBadge(uid, 'scholar'))
  }

  return NextResponse.json({ badges: badgeMap })
}

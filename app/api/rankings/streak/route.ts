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

function calcStreaks(dates: string[]): { current: number; max: number } {
  if (!dates.length) return { current: 0, max: 0 }

  const sorted = [...new Set(dates)].sort()

  // 역대 최장 streak
  let max = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000
    )
    if (diff === 1) { run++; if (run > max) max = run }
    else run = 1
  }

  // 현재 streak (오늘 또는 어제부터 역순 연속)
  const today = getTodayKST()
  const yesterday = getYesterdayKST()
  const descSorted = [...sorted].reverse()
  const anchor = descSorted[0]
  if (anchor !== today && anchor !== yesterday) return { current: 0, max }

  let current = 0
  let expected = anchor
  for (const d of descSorted) {
    if (d === expected) {
      current++
      expected = prevDay(expected)
    } else {
      break
    }
  }

  return { current, max }
}

export async function GET() {
  const { data: rows, error } = await supabaseServer
    .from('attendance')
    .select('pi_uid, checked_date')
    .order('checked_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // pi_uid별 날짜 그룹화
  const byUid: Record<string, string[]> = {}
  for (const row of rows ?? []) {
    if (!byUid[row.pi_uid]) byUid[row.pi_uid] = []
    byUid[row.pi_uid].push(row.checked_date)
  }

  const streaks = Object.entries(byUid).map(([pi_uid, dates]) => {
    const { current, max } = calcStreaks(dates)
    return { pi_uid, current, max }
  })

  // 프로필 조회
  const uids = streaks.map(s => s.pi_uid)
  const { data: profiles } = uids.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name').in('pi_uid', uids)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.pi_uid, p]))

  const enriched = streaks.map(s => ({
    ...s,
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

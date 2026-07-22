export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getTodayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function getWeekStartKST(): string {
  const now = new Date(Date.now() + 9 * 3600000)
  const sun = new Date(now.getTime() - now.getUTCDay() * 86400000)
  return `${sun.getUTCFullYear()}-${String(sun.getUTCMonth() + 1).padStart(2, '0')}-${String(sun.getUTCDate()).padStart(2, '0')}`
}

function prevDay(dateStr: string): string {
  const dt = new Date(dateStr)
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function getYesterdayKST(): string {
  return prevDay(getTodayKST())
}

// Calculate current streak from attendance dates (including today if present)
function calcCurrentStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  const today = getTodayKST()
  const yesterday = getYesterdayKST()
  // Streak must start from today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let streak = 0
  let expected = sorted[0]
  for (const d of sorted) {
    if (d === expected) {
      streak++
      expected = prevDay(expected)
    } else {
      break
    }
  }
  return streak
}

export async function GET(req: NextRequest) {
  const pi_uid = req.nextUrl.searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const today = getTodayKST()
  const weekStart = getWeekStartKST()

  const [{ data: todayRow }, { data: weekRows }, { data: totalRows }, { data: allDates }] = await Promise.all([
    supabaseServer.from('attendance').select('xp_earned, dice_result, dice_xp').eq('pi_uid', pi_uid).eq('checked_date', today).maybeSingle(),
    supabaseServer.from('attendance').select('xp_earned, dice_xp').eq('pi_uid', pi_uid).gte('checked_date', weekStart),
    supabaseServer.from('attendance').select('xp_earned, dice_xp').eq('pi_uid', pi_uid),
    supabaseServer.from('attendance').select('checked_date').eq('pi_uid', pi_uid).order('checked_date', { ascending: false }).limit(60),
  ])

  const streak = todayRow
    ? calcCurrentStreak((allDates ?? []).map(r => r.checked_date))
    : 0

  return NextResponse.json({
    checked_today: !!todayRow,
    streak,
    week_xp: (weekRows ?? []).reduce((s, r) => s + r.xp_earned + (r.dice_xp ?? 0), 0),
    total_xp: (totalRows ?? []).reduce((s, r) => s + r.xp_earned + (r.dice_xp ?? 0), 0),
  })
}

export async function POST(req: NextRequest) {
  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const today = getTodayKST()

  // Get past attendance dates for streak calculation
  const { data: pastDates } = await supabaseServer
    .from('attendance')
    .select('checked_date')
    .eq('pi_uid', pi_uid)
    .order('checked_date', { ascending: false })
    .limit(60)

  const { error } = await supabaseServer
    .from('attendance')
    .insert({ pi_uid, checked_date: today, xp_earned: 10 })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_checked' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate streak including today
  const allDates = [...(pastDates ?? []).map(r => r.checked_date), today]
  const streak = calcCurrentStreak(allDates)

  return NextResponse.json({ ok: true, xp_earned: 10, streak })
}

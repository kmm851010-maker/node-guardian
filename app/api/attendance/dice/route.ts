export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function prevDay(dateStr: string): string {
  const dt = new Date(dateStr)
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function getTodayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function getYesterdayKST(): string {
  return prevDay(getTodayKST())
}

// Calculate max streak ending at today/yesterday, and how many dice were already used
function calcStreakAndDice(dates: { checked_date: string; dice_result: number | null }[]): {
  streak: number
  totalDiceEarned: number
  diceUsed: number
} {
  if (!dates.length) return { streak: 0, totalDiceEarned: 0, diceUsed: 0 }

  const sorted = [...dates].sort((a, b) => b.checked_date.localeCompare(a.checked_date))
  const today = getTodayKST()
  const yesterday = getYesterdayKST()

  if (sorted[0].checked_date !== today && sorted[0].checked_date !== yesterday) {
    return { streak: 0, totalDiceEarned: 0, diceUsed: 0 }
  }

  let streak = 0
  let diceUsed = 0
  let expected = sorted[0].checked_date
  for (const d of sorted) {
    if (d.checked_date === expected) {
      streak++
      if (d.dice_result !== null) diceUsed++
      expected = prevDay(expected)
    } else {
      break
    }
  }

  const totalDiceEarned = Math.floor(streak / 7)
  return { streak, totalDiceEarned, diceUsed }
}

const DICE_XP = [0, 10, 20, 30, 40, 50, 100]

// GET: check how many dice rolls are available
export async function GET(req: NextRequest) {
  const pi_uid = req.nextUrl.searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const { data: rows } = await supabaseServer
    .from('attendance')
    .select('checked_date, dice_result')
    .eq('pi_uid', pi_uid)
    .order('checked_date', { ascending: false })
    .limit(120)

  const { streak, totalDiceEarned, diceUsed } = calcStreakAndDice(rows ?? [])
  const diceAvailable = Math.max(0, totalDiceEarned - diceUsed)

  return NextResponse.json({ streak, diceAvailable, totalDiceEarned, diceUsed })
}

// POST: roll one dice
export async function POST(req: NextRequest) {
  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const { data: rows } = await supabaseServer
    .from('attendance')
    .select('checked_date, dice_result')
    .eq('pi_uid', pi_uid)
    .order('checked_date', { ascending: false })
    .limit(120)

  const { streak, totalDiceEarned, diceUsed } = calcStreakAndDice(rows ?? [])
  const diceAvailable = Math.max(0, totalDiceEarned - diceUsed)

  if (diceAvailable <= 0) {
    return NextResponse.json({ error: 'no_dice_available' }, { status: 400 })
  }

  // Find the earliest row in current streak that has no dice_result
  const sorted = [...(rows ?? [])].sort((a, b) => b.checked_date.localeCompare(a.checked_date))
  const today = getTodayKST()
  const yesterday = getYesterdayKST()
  let expected = sorted[0]?.checked_date
  if (expected !== today && expected !== yesterday) {
    return NextResponse.json({ error: 'no_dice_available' }, { status: 400 })
  }

  // Collect streak dates in order (newest first)
  const streakDates: string[] = []
  for (const d of sorted) {
    if (d.checked_date === expected) {
      streakDates.push(d.checked_date)
      expected = prevDay(expected)
    } else {
      break
    }
  }

  // Find a 7-day boundary date that doesn't have dice yet
  // Dice goes on the 7th, 14th, 21st... day of the streak (oldest = day 1)
  const reversed = [...streakDates].reverse() // oldest first
  let targetDate: string | null = null
  for (let i = 6; i < reversed.length; i += 7) {
    const date = reversed[i]
    const row = sorted.find(r => r.checked_date === date)
    if (row && row.dice_result === null) {
      targetDate = date
      break
    }
  }

  if (!targetDate) {
    return NextResponse.json({ error: 'no_dice_available' }, { status: 400 })
  }

  const diceResult = Math.floor(Math.random() * 6) + 1
  const diceXp = DICE_XP[diceResult]

  const { error } = await supabaseServer
    .from('attendance')
    .update({ dice_result: diceResult, dice_xp: diceXp })
    .eq('pi_uid', pi_uid)
    .eq('checked_date', targetDate)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    dice_result: diceResult,
    dice_xp: diceXp,
    dice_remaining: diceAvailable - 1,
    streak,
  })
}

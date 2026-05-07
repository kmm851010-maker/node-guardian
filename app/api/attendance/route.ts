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

export async function GET(req: NextRequest) {
  const pi_uid = req.nextUrl.searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const today = getTodayKST()
  const weekStart = getWeekStartKST()

  const [{ data: todayRow }, { data: weekRows }, { data: totalRows }] = await Promise.all([
    supabaseServer.from('attendance').select('xp_earned').eq('pi_uid', pi_uid).eq('checked_date', today).maybeSingle(),
    supabaseServer.from('attendance').select('xp_earned').eq('pi_uid', pi_uid).gte('checked_date', weekStart),
    supabaseServer.from('attendance').select('xp_earned').eq('pi_uid', pi_uid),
  ])

  return NextResponse.json({
    checked_today: !!todayRow,
    week_xp: (weekRows ?? []).reduce((s, r) => s + r.xp_earned, 0),
    total_xp: (totalRows ?? []).reduce((s, r) => s + r.xp_earned, 0),
  })
}

export async function POST(req: NextRequest) {
  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const today = getTodayKST()
  const { error } = await supabaseServer
    .from('attendance')
    .insert({ pi_uid, checked_date: today, xp_earned: 10 })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_checked' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, xp_earned: 10 })
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getYesterdayKST(): string {
  const now = new Date(Date.now() + 9 * 3600000 - 86400000)
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

const UPTIME_XP = 5

async function run() {
  const yesterday = getYesterdayKST()

  // Find nodes that were online yesterday (last_seen within 24h window)
  // A node is considered "online for the day" if uptime_7d >= 90% and last_seen is recent
  const { data: onlineNodes, error } = await supabaseServer
    .from('node_status')
    .select('pi_uid')
    .not('uptime_7d', 'is', null)
    .gte('uptime_7d', 90)

  if (error) throw new Error(error.message)
  if (!onlineNodes?.length) return { granted: 0, skipped: 0 }

  // Check which users already got uptime XP for yesterday (prevent double-grant)
  const piUids = onlineNodes.map(n => n.pi_uid)
  const { data: existing } = await supabaseServer
    .from('uptime_xp_log')
    .select('pi_uid')
    .eq('granted_date', yesterday)
    .in('pi_uid', piUids)

  const alreadyGranted = new Set((existing ?? []).map(r => r.pi_uid))
  const toGrant = piUids.filter(uid => !alreadyGranted.has(uid))

  if (!toGrant.length) return { granted: 0, skipped: piUids.length }

  // Insert XP log entries
  const inserts = toGrant.map(pi_uid => ({
    pi_uid,
    granted_date: yesterday,
    xp: UPTIME_XP,
  }))

  for (let i = 0; i < inserts.length; i += 100) {
    await supabaseServer
      .from('uptime_xp_log')
      .insert(inserts.slice(i, i + 100))
  }

  // Also add to attendance table for XP totals (separate from manual check-in)
  const attendanceInserts = toGrant.map(pi_uid => ({
    pi_uid,
    checked_date: yesterday,
    xp_earned: UPTIME_XP,
  }))

  // Use upsert: if user already checked in manually, add uptime XP to existing row
  for (const row of attendanceInserts) {
    const { data: existingAtt } = await supabaseServer
      .from('attendance')
      .select('xp_earned')
      .eq('pi_uid', row.pi_uid)
      .eq('checked_date', row.checked_date)
      .maybeSingle()

    if (existingAtt) {
      await supabaseServer
        .from('attendance')
        .update({ xp_earned: existingAtt.xp_earned + UPTIME_XP })
        .eq('pi_uid', row.pi_uid)
        .eq('checked_date', row.checked_date)
    } else {
      await supabaseServer
        .from('attendance')
        .insert(row)
    }
  }

  return { granted: toGrant.length, skipped: alreadyGranted.size }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronOk = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await run()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

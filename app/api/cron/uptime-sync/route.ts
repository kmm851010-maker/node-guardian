export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function computeUptime(
  events: { event_type: string; created_at: string }[],
  windowStart: number,
  windowEnd: number,
): number {
  const DOWN = new Set(['process_critical', 'port_critical', 'node_offline'])
  const UP   = new Set(['process_recovery', 'port_recovery', 'startup', 'node_online'])

  const periods: { start: number; end: number | null }[] = []
  let downSince: number | null = null

  for (const e of events) {
    const ts = new Date(e.created_at).getTime()
    if (DOWN.has(e.event_type) && downSince === null) downSince = ts
    if (UP.has(e.event_type)   && downSince !== null) {
      periods.push({ start: downSince, end: ts })
      downSince = null
    }
  }
  if (downSince !== null) periods.push({ start: downSince, end: null })

  let downMs = 0
  for (const p of periods) {
    const s = Math.max(p.start, windowStart)
    const e = Math.min(p.end ?? windowEnd, windowEnd)
    if (e > s) downMs += e - s
  }

  const totalMs = windowEnd - windowStart
  return Math.max(0, Math.min(100, ((totalMs - downMs) / totalMs) * 100))
}

async function run() {
  const now     = Date.now()
  const weekAgo = now - 7  * 86400000
  const monthAgoISO = new Date(now - 30 * 86400000).toISOString()

  // 30일치 전체 이벤트 한 번에 fetch
  const { data: allEvents, error } = await supabaseServer
    .from('node_events')
    .select('pi_uid, event_type, created_at')
    .gte('created_at', monthAgoISO)
    .order('pi_uid')
    .order('created_at')

  if (error) throw new Error(error.message)

  // pi_uid별 그룹핑
  const byUser: Record<string, { event_type: string; created_at: string }[]> = {}
  for (const e of allEvents ?? []) {
    ;(byUser[e.pi_uid] ??= []).push(e)
  }

  // node_status에서 last_seen 가져와 활성 여부 판단
  const { data: statuses } = await supabaseServer
    .from('node_status')
    .select('pi_uid, last_seen')

  const updatedAt = new Date().toISOString()
  const upserts: Record<string, unknown>[] = []

  for (const ns of statuses ?? []) {
    const events     = byUser[ns.pi_uid] ?? []
    const lastSeenMs = ns.last_seen ? new Date(ns.last_seen).getTime() : 0

    const activeThisWeek  = lastSeenMs >= weekAgo
    const activeThisMonth = lastSeenMs >= (now - 30 * 86400000)

    const weekEvents = events.filter(e => new Date(e.created_at).getTime() >= weekAgo)

    let uptime_7d: number | null = null
    if (activeThisWeek) {
      uptime_7d = weekEvents.length === 0
        ? 100
        : Math.round(computeUptime(events, weekAgo, now) * 10) / 10
    }

    let uptime_30d: number | null = null
    if (activeThisMonth) {
      uptime_30d = events.length === 0
        ? 100
        : Math.round(computeUptime(events, now - 30 * 86400000, now) * 10) / 10
    }

    upserts.push({ pi_uid: ns.pi_uid, uptime_7d, uptime_30d, uptime_updated_at: updatedAt })
  }

  // 100개씩 배치 upsert
  for (let i = 0; i < upserts.length; i += 100) {
    await supabaseServer
      .from('node_status')
      .upsert(upserts.slice(i, i + 100), { onConflict: 'pi_uid' })
  }

  return upserts.length
}

// Vercel cron (GET)
export async function GET(req: NextRequest) {
  const auth    = req.headers.get('authorization')
  const cronOk  = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const updated = await run()
    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// 수동 트리거 (POST)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const updated = await run()
    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

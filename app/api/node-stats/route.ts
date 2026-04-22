export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { data: events } = await supabaseServer
    .from('node_events')
    .select('event_type, severity, created_at')
    .eq('pi_uid', pi_uid)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: true })

  const rows = events ?? []

  // 주간 가동률 계산 (critical/partial 이벤트 기준 다운타임)
  const WEEK_SEC = 7 * 24 * 60 * 60
  let downtime = 0
  let downSince: number | null = null

  for (const e of rows) {
    const ts = new Date(e.created_at).getTime()
    const isDown = e.event_type === 'process_critical' || e.event_type === 'port_critical' || e.event_type === 'port_partial'
    const isUp = e.event_type === 'process_recovery' || e.event_type === 'port_recovery' || e.event_type === 'startup'

    if (isDown && downSince === null) downSince = ts
    if (isUp && downSince !== null) {
      downtime += (ts - downSince) / 1000
      downSince = null
    }
  }
  if (downSince !== null) downtime += (Date.now() - downSince) / 1000
  const uptime_percent = Math.max(0, Math.min(100, ((WEEK_SEC - downtime) / WEEK_SEC) * 100))

  // 7일 일별 최악 상태
  const daily: { date: string; worst: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const start = d.toISOString()
    const end = new Date(d.getTime() + 86400000).toISOString()

    const dayEvents = rows.filter(e => e.created_at >= start && e.created_at < end)
    const hasCritical = dayEvents.some(e => e.severity === 'critical')
    const hasWarning = dayEvents.some(e => e.severity === 'warning')

    daily.push({
      date: d.toISOString().slice(0, 10),
      worst: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
    })
  }

  // 이벤트 건수 집계
  const event_counts = rows.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ uptime_percent, daily, event_counts })
}

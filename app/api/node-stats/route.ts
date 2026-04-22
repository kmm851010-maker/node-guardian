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

  // 7일 일별 최악 상태 + 가동률
  const daily: { date: string; worst: string; uptime: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const dayStart = d.getTime()
    const dayEnd = dayStart + 86400000
    const start = new Date(dayStart).toISOString()
    const end = new Date(dayEnd).toISOString()

    const dayEvents = rows.filter(e => e.created_at >= start && e.created_at < end)
    const hasCritical = dayEvents.some(e => e.severity === 'critical')
    const hasWarning = dayEvents.some(e => e.severity === 'warning')

    // 일별 다운타임 계산
    let dayDown = 0
    let dayDownSince: number | null = downSince !== null && i === 0 ? downSince : null

    // 이전 날에서 이어진 다운 상태 반영
    if (downSince !== null && downSince < dayStart) dayDownSince = dayStart

    for (const e of dayEvents) {
      const ts = new Date(e.created_at).getTime()
      const isDown = e.event_type === 'process_critical' || e.event_type === 'port_critical' || e.event_type === 'port_partial'
      const isUp = e.event_type === 'process_recovery' || e.event_type === 'port_recovery' || e.event_type === 'startup'
      if (isDown && dayDownSince === null) dayDownSince = ts
      if (isUp && dayDownSince !== null) { dayDown += (ts - dayDownSince) / 1000; dayDownSince = null }
    }
    if (dayDownSince !== null) {
      const until = Math.min(Date.now(), dayEnd)
      dayDown += (until - Math.max(dayDownSince, dayStart)) / 1000
    }

    const DAY_SEC = i === 0
      ? (Date.now() - dayStart) / 1000   // 오늘은 경과 시간 기준
      : 86400
    const dayUptime = Math.max(0, Math.min(100, ((DAY_SEC - dayDown) / DAY_SEC) * 100))

    daily.push({
      date: d.toISOString().slice(0, 10),
      worst: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
      uptime: Math.round(dayUptime * 10) / 10,
    })
  }

  // 이벤트 건수 집계
  const event_counts = rows.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ uptime_percent, daily, event_counts })
}

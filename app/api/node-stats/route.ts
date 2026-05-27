export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const weekAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000)

  const { data: events } = await supabaseServer
    .from('node_events')
    .select('event_type, severity, created_at')
    .eq('pi_uid', pi_uid)
    .gte('created_at', monthAgo.toISOString())
    .order('created_at', { ascending: true })

  const rows = events ?? []

  // 다운타임 구간 목록 생성 (통합 타임라인)
  const downtimePeriods: { start: number; end: number | null }[] = []
  let downSince: number | null = null

  for (const e of rows) {
    const ts = new Date(e.created_at).getTime()
    const isDown = ['process_critical', 'port_critical', 'node_offline'].includes(e.event_type)
    const isUp   = ['process_recovery', 'port_recovery', 'startup', 'node_online'].includes(e.event_type)

    if (isDown && downSince === null) downSince = ts
    if (isUp   && downSince !== null) {
      downtimePeriods.push({ start: downSince, end: ts })
      downSince = null
    }
  }
  if (downSince !== null) downtimePeriods.push({ start: downSince, end: null })

  // 특정 구간의 다운타임(초) 계산
  function calcDowntime(windowStart: number, windowEnd: number): number {
    let down = 0
    for (const p of downtimePeriods) {
      const s = Math.max(p.start, windowStart)
      const e = Math.min(p.end ?? Date.now(), windowEnd)
      if (e > s) down += (e - s) / 1000
    }
    return down
  }

  // 7일 가동률 (이벤트 없으면 null)
  const weekStart  = weekAgo.getTime()
  const monthStart = monthAgo.getTime()
  const now = Date.now()

  const weekRows  = rows.filter(e => new Date(e.created_at).getTime() >= weekStart)
  const weekSec   = (now - weekStart) / 1000
  const weekDown  = calcDowntime(weekStart, now)
  const uptime_7d = weekRows.length === 0
    ? null
    : Math.max(0, Math.min(100, ((weekSec - weekDown) / weekSec) * 100))

  // 30일 가동률 (이벤트 없으면 null)
  const monthSec   = (now - monthStart) / 1000
  const monthDown  = calcDowntime(monthStart, now)
  const uptime_30d = rows.length === 0
    ? null
    : Math.max(0, Math.min(100, ((monthSec - monthDown) / monthSec) * 100))

  // 노드가 데이터를 보내기 시작한 첫 번째 시점
  const firstEventTime = rows.length > 0 ? new Date(rows[0].created_at).getTime() : null

  // node_status의 last_seen도 확인 (이벤트 없이 heartbeat만 있는 경우 대비)
  const { data: nodeStatus } = await supabaseServer
    .from('node_status')
    .select('last_seen, uptime_start')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  const nodeStartTime = nodeStatus?.uptime_start
    ? new Date(nodeStatus.uptime_start).getTime()
    : firstEventTime

  // 7일 일별 가동률 + 최악 상태
  const daily: { date: string; worst: string; uptime: number; hasData: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const dayStart = d.getTime()
    const dayEnd   = i === 0 ? Date.now() : dayStart + 86400000
    const daySec   = (dayEnd - dayStart) / 1000

    const dayEvents = rows.filter(e => e.created_at >= new Date(dayStart).toISOString() && e.created_at < new Date(dayEnd).toISOString())
    const hasCritical = dayEvents.some(e => e.severity === 'critical')
    const hasWarning  = dayEvents.some(e => e.severity === 'warning')

    const dayDown   = calcDowntime(dayStart, dayEnd)
    const dayUptime = Math.max(0, Math.min(100, ((daySec - dayDown) / daySec) * 100))

    // 노드가 해당 날짜 이전부터 운영 중이면 이벤트 없어도 hasData=true (100% 정상 운영)
    const nodeWasActive = nodeStartTime !== null && nodeStartTime < dayEnd

    daily.push({
      date:    d.toISOString().slice(0, 10),
      worst:   hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
      uptime:  Math.round(dayUptime * 10) / 10,
      hasData: nodeWasActive || dayEvents.length > 0 || downtimePeriods.some(p => p.start < dayEnd && (p.end ?? Date.now()) > dayStart),
    })
  }

  // 이벤트 건수 집계
  const event_counts = rows.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ uptime_7d, uptime_30d, daily, event_counts })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Node Guardian → PiLink: 이벤트 수신
export async function POST(req: NextRequest) {
  // API 시크릿 인증
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { pi_uid, nickname, event_type, severity, message, detail } = body

  if (!pi_uid || !event_type || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 이벤트 저장
  const { error: eventError } = await supabaseServer
    .from('node_events')
    .insert({ pi_uid, event_type, severity: severity ?? 'info', message, detail: detail ?? null })

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  // 현재 상태 upsert
  const process_status =
    event_type === 'process_critical' ? 'critical'
    : event_type === 'process_warning' ? 'warning'
    : event_type === 'process_recovery' || event_type === 'startup' ? 'healthy'
    : undefined

  const port_status =
    event_type === 'port_critical' ? 'critical'
    : event_type === 'port_partial' ? 'partial'
    : event_type === 'port_recovery' || event_type === 'startup' ? 'healthy'
    : undefined

  const statusUpdate: Record<string, unknown> = {
    pi_uid,
    nickname: nickname ?? pi_uid,
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (process_status) statusUpdate.process_status = process_status
  if (port_status) statusUpdate.port_status = port_status
  if (event_type === 'startup') statusUpdate.uptime_start = new Date().toISOString()

  await supabaseServer.from('node_status').upsert(statusUpdate, { onConflict: 'pi_uid' })

  return NextResponse.json({ ok: true })
}

// 앱에서 이벤트 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = supabaseServer
    .from('node_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (pi_uid) query = query.eq('pi_uid', pi_uid)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

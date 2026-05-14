import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/webpush'
import { sendExpoToUser } from '@/lib/expopush'
import { sendTelegramMessage } from '@/lib/telegram'

async function sendTelegramToUser(pi_uid: string, severity: string, message: string) {
  const { data } = await supabaseServer
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('pi_uid', pi_uid)
    .maybeSingle()
  if (data?.chat_id) {
    const footer = severity === 'critical'
      ? '\n\n혹시 해결이 안 된다면?\n다른 운영자들이 같은 문제를 먼저 겪었을 수 있습니다.\n💬 <a href="https://linkpi.io">linkpi.io</a> → QnA에서 물어보세요'
      : '\n\n다음 중단은 막을 수 있습니다.\n운영자들의 노하우가 커뮤니티에 쌓이고 있어요.\n👉 <a href="https://linkpi.io">linkpi.io</a>'
    await sendTelegramMessage(data.chat_id, message + footer)
  }
}

// Node Guardian → PiLink: 이벤트 수신
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { pi_uid, nickname, event_type, severity, message, detail } = body

  if (!pi_uid || !event_type || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // heartbeat는 node_events에 저장하지 않고 node_status만 갱신
  if (event_type !== 'heartbeat') {
    const { error: eventError } = await supabaseServer
      .from('node_events')
      .insert({ pi_uid, event_type, severity: severity ?? 'info', message, detail: detail ?? null })

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }
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
  if (detail?.port_detail) statusUpdate.port_detail = detail.port_detail

  await supabaseServer.from('node_status').upsert(statusUpdate, { onConflict: 'pi_uid' })

  // startup 시 미복구 node_offline 있으면 즉시 복구 알림
  if (event_type === 'startup') {
    const { data: lastOffline } = await supabaseServer
      .from('node_events')
      .select('id, created_at')
      .eq('pi_uid', pi_uid)
      .eq('event_type', 'node_offline')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastOffline) {
      const { data: recovered } = await supabaseServer
        .from('node_events')
        .select('id')
        .eq('pi_uid', pi_uid)
        .eq('event_type', 'node_online')
        .gt('created_at', lastOffline.created_at)
        .limit(1)
        .maybeSingle()

      if (!recovered) {
        await supabaseServer.from('node_events').insert({
          pi_uid,
          event_type: 'node_online',
          severity: 'recovery',
          message: '노드 가디언 재접속 — 정상 모니터링이 재개됐습니다.',
        })
        await Promise.allSettled([
          sendTelegramToUser(pi_uid, 'recovery', '✅ 노드 가디언 재접속\n\n정상 모니터링이 재개됐습니다.'),
          sendExpoToUser(pi_uid, 'node_online', `✅ [@${pi_uid}] 재접속`, '정상 모니터링이 재개됐습니다.'),
        ])
      }
    }
  }

  // heartbeat, startup, info 이벤트는 알림 제외 (중요 이벤트만)
  if (severity !== 'info' && event_type !== 'heartbeat') {
    await Promise.allSettled([
      sendPushToUser(pi_uid, severity, message),
      sendExpoToUser(pi_uid, event_type, severity === 'critical' ? `🚨 [@${pi_uid}] 노드 이상` : severity === 'warning' ? `⚠️ [@${pi_uid}] 노드 경고` : severity === 'recovery' ? `✅ [@${pi_uid}] 복구` : `📡 [@${pi_uid}]`, message),
      sendTelegramToUser(pi_uid, severity, message),
    ])
  }

  return NextResponse.json({ ok: true })
}

// 앱에서 이벤트 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  const username = searchParams.get('username')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // pi_uid(UUID)로 먼저 조회
  if (pi_uid) {
    const { data, error } = await supabaseServer
      .from('node_events')
      .select('*')
      .eq('pi_uid', pi_uid)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 결과 없고 username 있으면 username(PC가 저장한 pi_uid)으로 재조회
    if ((!data || data.length === 0) && username) {
      const { data: data2, error: error2 } = await supabaseServer
        .from('node_events')
        .select('*')
        .eq('pi_uid', username)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
      return NextResponse.json({ data: data2 ?? [] })
    }

    return NextResponse.json({ data: data ?? [] })
  }

  const { data, error } = await supabaseServer
    .from('node_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

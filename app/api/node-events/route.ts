import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import webpush from 'web-push'
import { sendTelegramMessage } from '@/lib/telegram'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// severity별 알림 제목
const PUSH_TITLE: Record<string, string> = {
  critical: '🚨 노드 이상 감지',
  warning:  '⚠️ 노드 경고',
  recovery: '✅ 노드 복구',
  info:     '🟢 노드 정보',
}

async function sendPushToUser(pi_uid: string, severity: string, message: string) {
  const { data: subs } = await supabaseServer
    .from('push_subscriptions')
    .select('*')
    .eq('pi_uid', pi_uid)

  if (!subs || subs.length === 0) return

  const payload = JSON.stringify({
    title: PUSH_TITLE[severity] ?? '📡 PiLink',
    body: message,
  })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        // 만료된 구독 삭제
        if (err.statusCode === 410) {
          await supabaseServer
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      })
    )
  )
}

async function sendTelegramToUser(pi_uid: string, severity: string, message: string) {
  const { data } = await supabaseServer
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('pi_uid', pi_uid)
    .maybeSingle()
  if (data?.chat_id) {
    const footer = severity === 'critical'
      ? '\n\n💬 비슷한 문제? QnA에서 도움받기\n📋 이벤트 전체 기록\n👉 <a href="https://pilink.vercel.app">pilink.vercel.app</a>'
      : '\n\n📋 이벤트 전체 기록 → <a href="https://pilink.vercel.app">pilink.vercel.app</a>'
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

  // heartbeat, startup, info 이벤트는 알림 제외 (중요 이벤트만)
  if (severity !== 'info' && event_type !== 'heartbeat') {
    await Promise.allSettled([
      sendPushToUser(pi_uid, severity, message),
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

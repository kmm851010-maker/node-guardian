import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'
import { supabaseServer } from '@/lib/supabase-server'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}

// Telegram이 POST로 업데이트를 보냄
export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = body?.message
  if (!message) return NextResponse.json({ ok: true })

  const chat_id = message.chat?.id
  const text = message.text ?? ''

  if (text === '/start' || text.startsWith('/start ')) {
    await sendTelegramMessage(
      chat_id,
      `👋 안녕하세요!\n\n당신의 <b>Chat ID</b>는:\n<code>${chat_id}</code>\n\n위 숫자를 복사해서 PiLink 프로필 탭 → 텔레그램 알림에 입력하세요.\n노드에 이상이 생기면 이 채팅으로 즉시 알려드립니다. 🛡️\n\n<b>명령어</b>\n/status — 내 노드 현재 상태 조회`,
    )
    return NextResponse.json({ ok: true })
  }

  if (text === '/status') {
    const { data: sub } = await supabaseServer
      .from('telegram_subscriptions')
      .select('pi_uid')
      .eq('chat_id', String(chat_id))
      .maybeSingle()

    if (!sub?.pi_uid) {
      await sendTelegramMessage(
        chat_id,
        `연결된 계정이 없습니다.\n👉 <a href="https://pilink.vercel.app">pilink.vercel.app</a> 프로필 탭에서 텔레그램 알림을 연결해주세요.`,
      )
      return NextResponse.json({ ok: true })
    }

    const { data: status } = await supabaseServer
      .from('node_status')
      .select('process_status, port_status, last_seen')
      .eq('nickname', sub.pi_uid)
      .maybeSingle()

    if (!status) {
      await sendTelegramMessage(
        chat_id,
        `Node Guardian이 실행 중이지 않거나 아직 데이터가 없습니다.\n👉 <a href="https://pilink.vercel.app">pilink.vercel.app</a>`,
      )
      return NextResponse.json({ ok: true })
    }

    const procIcon = status.process_status === 'healthy' ? '🟢' : status.process_status === 'warning' ? '🟡' : '🔴'
    const portIcon = status.port_status === 'healthy' ? '🟢' : status.port_status === 'partial' ? '🟡' : '🔴'
    const procLabel = status.process_status === 'healthy' ? '정상' : status.process_status === 'warning' ? '경고' : '중단'
    const portLabel = status.port_status === 'healthy' ? '정상' : status.port_status === 'partial' ? '일부 차단' : '중단'

    await sendTelegramMessage(
      chat_id,
      `🛡️ <b>내 노드 현재 상태</b>\n\n` +
      `${procIcon} 프로세스: ${procLabel}\n` +
      `${portIcon} 포트: ${portLabel}\n` +
      `🕐 마지막 신호: ${timeAgo(status.last_seen)}\n\n` +
      `👉 <a href="https://pilink.vercel.app">pilink.vercel.app</a> 에서 이벤트 기록 확인`,
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

// 웹훅 등록용 (브라우저에서 한 번만 호출)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'No bot token' }, { status: 500 })

  const host = req.headers.get('host') ?? 'linkpi.io'
  const webhookUrl = `https://${host}/api/telegram-webhook`

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}

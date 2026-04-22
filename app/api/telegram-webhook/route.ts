import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

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
      `👋 안녕하세요!\n\n당신의 <b>Chat ID</b>는:\n<code>${chat_id}</code>\n\n위 숫자를 복사해서 PiLink 프로필 탭 → 텔레그램 알림에 입력하세요.\n노드에 이상이 생기면 이 채팅으로 즉시 알려드립니다. 🛡️`,
    )
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

  const host = req.headers.get('host') ?? 'pilink.vercel.app'
  const webhookUrl = `https://${host}/api/telegram-webhook`

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}

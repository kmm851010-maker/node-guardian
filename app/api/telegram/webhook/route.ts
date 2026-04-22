export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chat_id: number = message.chat.id
    const text: string = (message.text ?? '').trim()

    // /start {pi_uid} 또는 /등록 {pi_uid}
    const match = text.match(/^\/(?:start|등록)\s+(\S+)/i)
    if (match) {
      const pi_uid = match[1].toLowerCase()

      await supabaseServer
        .from('telegram_subscriptions')
        .upsert({ pi_uid, chat_id }, { onConflict: 'pi_uid' })

      await sendTelegramMessage(chat_id,
        `✅ <b>등록 완료!</b>\n\n` +
        `Pi 사용자명: <code>${pi_uid}</code>\n` +
        `이제 노드 이상 발생 시 이 채팅으로 알림을 받습니다.\n\n` +
        `📡 <b>LinkPi</b> — Pi Node 모니터링`
      )
      return NextResponse.json({ ok: true })
    }

    // /start (파라미터 없이)
    if (text === '/start') {
      await sendTelegramMessage(chat_id,
        `👋 <b>LinkPi Node Guardian 봇입니다!</b>\n\n` +
        `Pi 사용자명으로 등록하려면:\n` +
        `<code>/start 파이사용자명</code>\n\n` +
        `예시: <code>/start leechwile</code>`
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

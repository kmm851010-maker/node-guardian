import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ subscribed: false })

  const { data } = await supabaseServer
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  return NextResponse.json({ subscribed: !!data?.chat_id, chat_id: data?.chat_id ?? null })
}

export async function POST(req: NextRequest) {
  const { pi_uid, chat_id } = await req.json()
  if (!pi_uid || !chat_id) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('telegram_subscriptions')
    .upsert({ pi_uid, chat_id: String(chat_id) }, { onConflict: 'pi_uid' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendTelegramMessage(
    chat_id,
    '✅ PiLink 노드 알림이 연결됐습니다!\n노드에 이상이 생기면 이 채팅으로 즉시 알려드립니다.',
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  await supabaseServer.from('telegram_subscriptions').delete().eq('pi_uid', pi_uid)
  return NextResponse.json({ ok: true })
}

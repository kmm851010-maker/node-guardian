export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const pi_uid = req.nextUrl.searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const { data, error } = await supabaseServer
    .from('expo_push_tokens')
    .select('token, prefs, created_at')
    .eq('pi_uid', pi_uid)

  return NextResponse.json({ pi_uid, rows: data ?? [], error: error?.message ?? null })
}

export async function POST(req: NextRequest) {
  const { pi_uid, title, body } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const { data: rows } = await supabaseServer
    .from('expo_push_tokens')
    .select('token, prefs')
    .eq('pi_uid', pi_uid)

  if (!rows?.length) return NextResponse.json({ error: 'No tokens found for this user' })

  const tokens = rows.map(r => r.token as string).filter(Boolean)

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title ?? '테스트 알림',
      body: body ?? '알림이 정상 작동합니다.',
    }))),
  })
  const json = await res.json()

  return NextResponse.json({ tokens, expo_response: json })
}

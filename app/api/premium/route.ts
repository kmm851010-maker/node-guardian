import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// 프리미엄 상태 확인
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')

  if (!pi_uid) return NextResponse.json({ isPremium: false })

  const { data } = await supabaseServer
    .from('premium_users')
    .select('expires_at, canceled')
    .eq('pi_uid', pi_uid)
    .single()

  if (!data) return NextResponse.json({ isPremium: false })

  const isPremium = data.expires_at
    ? new Date(data.expires_at) > new Date()
    : true

  return NextResponse.json({ isPremium, expires_at: data.expires_at, canceled: data.canceled ?? false })
}

// 구독 해지 (기간은 유지, canceled 플래그만 저장)
export async function DELETE(req: NextRequest) {
  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const { error } = await supabaseServer
    .from('premium_users')
    .update({ canceled: true })
    .eq('pi_uid', pi_uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

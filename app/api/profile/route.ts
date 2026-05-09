import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  const username = searchParams.get('username')
  if (!pi_uid) return NextResponse.json({})

  // pi_uid로 먼저 조회, 없으면 nickname(username)으로 fallback
  let { data } = await supabaseServer
    .from('node_profiles')
    .select('display_name, avatar_url, nickname')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  if (!data && username) {
    const { data: data2 } = await supabaseServer
      .from('node_profiles')
      .select('display_name, avatar_url, nickname')
      .eq('nickname', username)
      .maybeSingle()
    data = data2
  }

  return NextResponse.json(data ?? {})
}

export async function PATCH(req: NextRequest) {
  const { pi_uid, nickname, display_name } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const trimmed = (display_name ?? '').trim().slice(0, 20)
  if (!trimmed) return NextResponse.json({ error: 'Invalid display_name' }, { status: 400 })

  // 중복 닉네임 체크 (같은 display_name을 다른 사용자가 사용 중인지)
  const { data: existing } = await supabaseServer
    .from('node_profiles')
    .select('pi_uid, nickname')
    .eq('display_name', trimmed)
    .maybeSingle()
  if (existing && existing.pi_uid !== pi_uid && existing.nickname !== nickname) {
    return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 })
  }

  // pi_uid로 UPDATE 시도
  const { data: updated, error: updateError } = await supabaseServer
    .from('node_profiles')
    .update({ display_name: trimmed })
    .eq('pi_uid', pi_uid)
    .select('display_name')
    .maybeSingle()

  if (updateError) {
    console.error('[profile PATCH update by pi_uid]', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (updated) {
    return NextResponse.json({ ok: true, display_name: updated.display_name ?? trimmed })
  }

  // pi_uid로 못 찾으면 nickname으로 UPDATE (Node Guardian이 username을 pi_uid로 저장한 케이스)
  if (nickname) {
    const { data: updated2, error: updateError2 } = await supabaseServer
      .from('node_profiles')
      .update({ display_name: trimmed })
      .eq('nickname', nickname)
      .select('display_name')
      .maybeSingle()

    if (updateError2) {
      console.error('[profile PATCH update by nickname]', updateError2.message)
      return NextResponse.json({ error: updateError2.message }, { status: 500 })
    }

    if (updated2) {
      return NextResponse.json({ ok: true, display_name: updated2.display_name ?? trimmed })
    }
  }

  // 행이 없으면 INSERT
  const { error: insertError } = await supabaseServer
    .from('node_profiles')
    .insert({ pi_uid, nickname: nickname ?? pi_uid, display_name: trimmed })

  if (insertError) {
    console.error('[profile PATCH insert]', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, display_name: trimmed })
}

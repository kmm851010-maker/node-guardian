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

  // pi_uid 또는 nickname으로 기존 row 찾기 (OR 쿼리)
  const orFilter = nickname
    ? `pi_uid.eq.${pi_uid},nickname.eq.${nickname}`
    : `pi_uid.eq.${pi_uid}`
  const { data: rows } = await supabaseServer
    .from('node_profiles')
    .select('pi_uid')
    .or(orFilter)
    .limit(1)

  if (rows && rows.length > 0) {
    // 찾은 row의 pi_uid로 업데이트 (어느 경로로 찾았든 동일하게 처리)
    const { error } = await supabaseServer
      .from('node_profiles')
      .update({ display_name: trimmed })
      .eq('pi_uid', rows[0].pi_uid)
    if (error) {
      console.error('[profile PATCH update]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, display_name: trimmed })
  }

  // row 없으면 INSERT
  const { error: insertError } = await supabaseServer
    .from('node_profiles')
    .insert({ pi_uid, nickname: nickname ?? pi_uid, display_name: trimmed })

  if (insertError) {
    if (insertError.code === '23505' && nickname) {
      // nickname 충돌 — 해당 row 업데이트
      await supabaseServer.from('node_profiles')
        .update({ display_name: trimmed, pi_uid })
        .eq('nickname', nickname)
      return NextResponse.json({ ok: true, display_name: trimmed })
    }
    console.error('[profile PATCH insert]', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, display_name: trimmed })
}

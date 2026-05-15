export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { pi_uid, code } = await req.json()
  if (!pi_uid || !code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data } = await supabaseServer
    .from('guardian_pair_codes')
    .select('code, expires_at')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'NodeGuardian에서 연동 코드를 먼저 생성해주세요.' }, { status: 400 })
  }
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: '코드가 만료됐습니다. NodeGuardian에서 새 코드를 생성해주세요.' }, { status: 400 })
  }
  if (data.code !== code) {
    return NextResponse.json({ error: '코드가 일치하지 않습니다.' }, { status: 400 })
  }

  await supabaseServer.from('guardian_pair_codes').delete().eq('pi_uid', pi_uid)

  return NextResponse.json({ ok: true })
}

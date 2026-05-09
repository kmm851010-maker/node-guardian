export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { pi_uid, nickname } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const { error } = await supabaseServer
    .from('node_status')
    .upsert(
      { pi_uid, nickname, last_web_login: new Date().toISOString() },
      { onConflict: 'pi_uid' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // node_profiles: pi_uid로 먼저 upsert 시도
  const { error: profileError } = await supabaseServer
    .from('node_profiles')
    .upsert({ pi_uid, nickname }, { onConflict: 'pi_uid' })

  // nickname unique 충돌(기존 row의 pi_uid가 다름) → pi_uid를 현재 값으로 교체
  if (profileError?.code === '23505') {
    await supabaseServer
      .from('node_profiles')
      .update({ pi_uid })
      .eq('nickname', nickname)
  } else if (profileError) {
    console.error('[user-login] node_profiles:', profileError.message)
  }

  return NextResponse.json({ ok: true })
}

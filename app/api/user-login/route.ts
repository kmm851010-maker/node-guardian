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
  return NextResponse.json({ ok: true })
}

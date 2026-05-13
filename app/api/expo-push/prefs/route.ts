export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { pi_uid, prefs } = await req.json()
  if (!pi_uid || !prefs) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await supabaseServer
    .from('expo_push_tokens')
    .update({ prefs })
    .eq('pi_uid', pi_uid)

  return NextResponse.json({ ok: true })
}

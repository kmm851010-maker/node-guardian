export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pi_uid } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error } = await supabaseServer
    .from('guardian_pair_codes')
    .upsert({ pi_uid, code, expires_at }, { onConflict: 'pi_uid' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ code, expires_minutes: 10 })
}

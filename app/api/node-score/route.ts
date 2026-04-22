import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { pi_uid, score } = await req.json()

  if (!pi_uid || score === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('node_status')
    .update({
      node_score: score,
      node_score_updated_at: new Date().toISOString(),
    })
    .eq('pi_uid', pi_uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

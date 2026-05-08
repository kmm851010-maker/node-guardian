import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({})

  const { data } = await supabaseServer
    .from('node_profiles')
    .select('display_name, avatar_url, nickname')
    .eq('pi_uid', pi_uid)
    .single()

  return NextResponse.json(data ?? {})
}

export async function PATCH(req: NextRequest) {
  const { pi_uid, display_name } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'Missing pi_uid' }, { status: 400 })

  const trimmed = (display_name ?? '').trim().slice(0, 20)
  if (!trimmed) return NextResponse.json({ error: 'Invalid display_name' }, { status: 400 })

  const { error } = await supabaseServer
    .from('node_profiles')
    .update({ display_name: trimmed })
    .eq('pi_uid', pi_uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, display_name: trimmed })
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const VALID_LOCALES = ['ko', 'en', 'zh-TW', 'vi']

export async function POST(req: NextRequest) {
  const { pi_uid, locale } = await req.json()
  if (!pi_uid || !locale) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!VALID_LOCALES.includes(locale)) return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })

  const { error } = await supabaseServer
    .from('node_profiles')
    .update({ locale })
    .eq('pi_uid', pi_uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, locale })
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { pi_uid, nickname } = await req.json()
  if (!pi_uid) return NextResponse.json({ error: 'pi_uid required' }, { status: 400 })

  const [{ error }, { error: profileError }] = await Promise.all([
    supabaseServer
      .from('node_status')
      .upsert(
        { pi_uid, nickname, last_web_login: new Date().toISOString() },
        { onConflict: 'pi_uid' }
      ),
    supabaseServer
      .from('node_profiles')
      .upsert(
        { pi_uid, nickname },
        { onConflict: 'pi_uid' }
      ),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (profileError) console.error('[user-login] node_profiles upsert:', profileError.message)
  return NextResponse.json({ ok: true })
}

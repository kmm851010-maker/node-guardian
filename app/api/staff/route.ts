export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const MASTER = 'doosanprince'

export async function GET(req: NextRequest) {
  const pi_uid = req.nextUrl.searchParams.get('pi_uid')
  if (!pi_uid) return NextResponse.json({ isStaff: false })

  const { data } = await supabaseServer
    .from('staff_members')
    .select('pi_uid')
    .eq('pi_uid', pi_uid)
    .maybeSingle()

  return NextResponse.json({ isStaff: !!data })
}

export async function POST(req: NextRequest) {
  const { target_uid, master_username, action } = await req.json()

  if (master_username !== MASTER) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  if (!target_uid || !['appoint', 'remove'].includes(action)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  if (action === 'appoint') {
    await supabaseServer.from('staff_members').upsert({ pi_uid: target_uid }, { onConflict: 'pi_uid' })
  } else {
    await supabaseServer.from('staff_members').delete().eq('pi_uid', target_uid)
  }

  return NextResponse.json({ ok: true })
}

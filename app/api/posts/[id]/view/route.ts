export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await supabaseServer.rpc('increment_views', { post_id: params.id })
  return NextResponse.json({ ok: true })
}

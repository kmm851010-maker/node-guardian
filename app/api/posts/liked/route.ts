export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const author_uid = searchParams.get('author_uid')
  if (!author_uid) return NextResponse.json({ data: [] })

  const { data } = await supabaseServer
    .from('post_likes')
    .select('post_id')
    .eq('author_uid', author_uid)

  return NextResponse.json({ data: (data ?? []).map(r => r.post_id) })
}

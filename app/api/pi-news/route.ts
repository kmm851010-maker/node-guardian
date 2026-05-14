export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data } = await supabaseServer
    .from('pi_news')
    .select('title_ko, link, pub_date')
    .order('pub_date', { ascending: false })
    .limit(5)

  const items = (data ?? []).map(row => ({
    title: row.title_ko,
    link:  row.link,
    date:  row.pub_date ? new Date(row.pub_date).toLocaleDateString('ko-KR') : '',
  }))

  return NextResponse.json({ items })
}

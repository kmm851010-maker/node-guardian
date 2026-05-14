export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

async function translateToKo(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json()
    const translated = (json[0] as [string, string][]).map(seg => seg[0]).join('')
    return translated || text
  } catch {
    return text
  }
}

export async function GET() {
  // DB에서 읽기
  const { data } = await supabaseServer
    .from('pi_news')
    .select('title_ko, link, pub_date')
    .order('pub_date', { ascending: false })
    .limit(5)

  if (data && data.length > 0) {
    const items = data.map(row => ({
      title: row.title_ko,
      link:  row.link,
      date:  row.pub_date ? new Date(row.pub_date).toLocaleDateString('ko-KR') : '',
    }))
    return NextResponse.json({ items })
  }

  // DB 비어있으면 rss2json 폴백
  try {
    const res = await fetch(
      'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fminepi.com%2Fblog%2Ffeed%2F',
      { cache: 'no-store' }
    )
    const json = await res.json()
    if (json.status !== 'ok') return NextResponse.json({ items: [] })

    const raw = (json.items as { title: string; link: string; pubDate: string }[]).slice(0, 5)
    const items = await Promise.all(
      raw.map(async item => ({
        title: await translateToKo(item.title),
        link:  item.link,
        date:  item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : '',
      }))
    )
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}

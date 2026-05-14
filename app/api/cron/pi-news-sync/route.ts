export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fminepi.com%2Fblog%2Ffeed%2F',
    { cache: 'no-store' }
  )
  const json = await res.json()

  if (json.status !== 'ok') {
    return NextResponse.json({ error: 'RSS fetch failed', detail: json }, { status: 502 })
  }

  const raw = (json.items as { title: string; link: string; pubDate: string }[]).slice(0, 5)

  const rows = await Promise.all(
    raw.map(async item => ({
      id:       item.link,
      title:    item.title,
      title_ko: await translateToKo(item.title),
      link:     item.link,
      pub_date: item.pubDate,
    }))
  )

  const { error } = await supabaseServer
    .from('pi_news')
    .upsert(rows, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, synced: rows.length })
}

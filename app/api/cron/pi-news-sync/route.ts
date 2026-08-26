export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

async function translateToKo(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`
    const res = await fetch(url)
    const json = await res.json()
    const translated = json?.responseData?.translatedText
    return (translated && translated !== text) ? translated : text
  } catch {
    return text
  }
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, 's').exec(xml)
  if (cdataMatch) return cdataMatch[1].trim()
  const plainMatch = new RegExp(`<${tag}>(.*?)</${tag}>`, 's').exec(xml)
  return plainMatch ? plainMatch[1].trim() : ''
}

async function fetchRssItems() {
  const res = await fetch('https://minepi.com/blog/feed/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PiLinkBot/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)

  const xml = await res.text()
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const items: { title: string; link: string; pubDate: string }[] = []
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
    const block = match[1]
    items.push({
      title:   extractTag(block, 'title'),
      link:    extractTag(block, 'link') || extractTag(block, 'guid'),
      pubDate: extractTag(block, 'pubDate'),
    })
  }
  return items
}

export async function GET() {
  try {
    const raw = await fetchRssItems()

    const rows = await Promise.all(
      raw.map(async item => ({
        id:       item.link,
        title:    item.title,
        title_ko: await translateToKo(item.title),
        link:     item.link,
        pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      }))
    )

    const { error } = await supabaseServer
      .from('pi_news')
      .upsert(rows, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, synced: rows.length, latest: rows[0]?.title })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}

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
  // DB에서 읽기
  const { data } = await supabaseServer
    .from('pi_news')
    .select('title_ko, link, pub_date')
    .order('pub_date', { ascending: false })
    .limit(5)

  if (data && data.length > 0) {
    return NextResponse.json({
      items: data.map(row => ({
        title: row.title_ko,
        link:  row.link,
        date:  row.pub_date ? new Date(row.pub_date).toLocaleDateString('ko-KR') : '',
      })),
    })
  }

  // DB 비어있으면 직접 RSS 폴백
  try {
    const raw = await fetchRssItems()
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

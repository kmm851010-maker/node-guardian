export const revalidate = 1800 // 30분 캐시

import { NextResponse } from 'next/server'

async function translateToKo(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json()
    // 응답 구조: [[[번역문, 원문, ...], ...], ...]
    const translated = (json[0] as [string, string][]).map(seg => seg[0]).join('')
    return translated || text
  } catch {
    return text
  }
}

export async function GET() {
  try {
    const res = await fetch('https://minepi.com/blog/feed/', {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await res.text()

    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    const raw = itemMatches.slice(0, 5).map(m => {
      const block = m[1]
      const title   = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
                   ?? block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
      const link    = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
                   ?? block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? ''
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ''
      return { title: title.trim(), link: link.trim(), pubDate: pubDate.trim() }
    })

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

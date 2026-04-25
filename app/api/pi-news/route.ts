export const revalidate = 1800 // 30분 캐시

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://minepi.com/blog/feed', {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await res.text()

    const items: { title: string; link: string; date: string }[] = []
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
      const block = match[1]
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ?? ''
      const link  = block.match(/<link>(.*?)<\/link>|<link\s[^>]*href="([^"]+)"/)?.[1] ?? ''
      const date  = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''

      if (title && link) {
        items.push({
          title: title.trim(),
          link:  link.trim(),
          date:  date ? new Date(date).toLocaleDateString('ko-KR') : '',
        })
      }
      if (items.length >= 5) break
    }

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}

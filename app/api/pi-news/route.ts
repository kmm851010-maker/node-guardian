export const revalidate = 1800 // 30분 캐시

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fminepi.com%2Fblog%2Ffeed',
      { next: { revalidate: 1800 } }
    )
    const json = await res.json()

    if (json.status !== 'ok') return NextResponse.json({ items: [] })

    const items = (json.items as { title: string; link: string; pubDate: string }[])
      .slice(0, 5)
      .map(item => ({
        title: item.title,
        link:  item.link,
        date:  item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : '',
      }))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}

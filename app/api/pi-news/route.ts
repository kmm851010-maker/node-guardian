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
    const res = await fetch(
      'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fminepi.com%2Fblog%2Ffeed',
      { next: { revalidate: 1800 } }
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

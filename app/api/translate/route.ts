export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const LANG_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  'zh-TW': 'zh-TW',
  vi: 'vi',
}

export async function POST(req: NextRequest) {
  const { text, target } = await req.json()
  if (!text || !target) return NextResponse.json({ error: 'Missing text or target' }, { status: 400 })

  const tl = LANG_MAP[target]
  if (!tl) return NextResponse.json({ error: 'Invalid target language' }, { status: 400 })

  // Limit text length to prevent abuse
  const trimmed = String(text).slice(0, 5000)

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=auto|${encodeURIComponent(tl)}`
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'Translation service error' }, { status: 502 })

    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (!translated) return NextResponse.json({ error: 'No translation result' }, { status: 502 })

    return NextResponse.json({ translated, detectedLang: 'auto' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

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
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(trimmed)}`
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'Translation service error' }, { status: 502 })

    const data = await res.json()
    // Response format: [[["translated text","original text",null,null,x],...],null,"detected_lang"]
    const translated = (data[0] as any[])
      .map((segment: any) => segment[0])
      .join('')

    return NextResponse.json({ translated, detectedLang: data[2] ?? 'unknown' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

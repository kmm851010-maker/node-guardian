'use client'

import { useState, useCallback } from 'react'
import { Languages } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'

const LABELS: Record<string, { translate: string; original: string; translating: string; failed: string }> = {
  ko: { translate: '번역하기', original: '원문 보기', translating: '번역 중...', failed: '번역 실패' },
  en: { translate: 'Translate', original: 'Show original', translating: 'Translating...', failed: 'Translation failed' },
  'zh-TW': { translate: '翻譯', original: '顯示原文', translating: '翻譯中...', failed: '翻譯失敗' },
  vi: { translate: 'Dịch', original: 'Xem bản gốc', translating: 'Đang dịch...', failed: 'Dịch thất bại' },
}

const SEP = '\n⟦SEP⟧\n'

interface Props {
  /** Main post content (title + body) */
  text: string
  /** Array of comment contents to batch-translate */
  comments?: { id: string; content: string }[]
  /** Called with translated results */
  onTranslated?: (result: { text: string; comments: Record<string, string> }) => void
  /** Called when toggling back to original */
  onShowOriginal?: () => void
  className?: string
}

export default function TranslateButton({ text, comments = [], onTranslated, onShowOriginal, className = '' }: Props) {
  const { locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [error, setError] = useState(false)

  const labels = LABELS[locale] ?? LABELS.en

  const handleClick = useCallback(async () => {
    if (translated) {
      setTranslated(false)
      onShowOriginal?.()
      return
    }

    setLoading(true)
    setError(false)

    // Build batch: post text + all comments joined by separator
    const parts = [text, ...comments.map(c => c.content)]
    const batch = parts.join(SEP)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batch, target: locale }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const translatedParts = data.translated.split(/\n?⟦SEP⟧\n?/)

      const commentMap: Record<string, string> = {}
      comments.forEach((c, i) => {
        if (translatedParts[i + 1]) commentMap[c.id] = translatedParts[i + 1].trim()
      })

      setTranslated(true)
      onTranslated?.({ text: translatedParts[0]?.trim() ?? '', comments: commentMap })
    } catch {
      setError(true)
    }
    setLoading(false)
  }, [text, comments, locale, translated, onTranslated, onShowOriginal])

  if (locale === 'ko') return null

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors disabled:opacity-50"
      >
        <Languages size={12} />
        {loading ? labels.translating : translated ? labels.original : labels.translate}
      </button>
      {error && <p className="text-xs text-red-500 mt-0.5">{labels.failed}</p>}
    </div>
  )
}

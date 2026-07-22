'use client'

import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'

const LABELS: Record<string, { translate: string; original: string; translating: string; failed: string }> = {
  ko: { translate: '번역하기', original: '원문 보기', translating: '번역 중...', failed: '번역 실패' },
  en: { translate: 'Translate', original: 'Show original', translating: 'Translating...', failed: 'Translation failed' },
  'zh-TW': { translate: '翻譯', original: '顯示原文', translating: '翻譯中...', failed: '翻譯失敗' },
  vi: { translate: 'Dịch', original: 'Xem bản gốc', translating: 'Đang dịch...', failed: 'Dịch thất bại' },
}

interface Props {
  text: string
  className?: string
}

export default function TranslateButton({ text, className = '' }: Props) {
  const { locale } = useI18n()
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTranslated, setShowTranslated] = useState(false)
  const [error, setError] = useState(false)

  const labels = LABELS[locale] ?? LABELS.en

  // Don't show translate button for Korean content when locale is Korean
  // Actually, always show it - user might want to translate non-Korean content too

  const handleTranslate = async () => {
    if (translated) {
      setShowTranslated(true)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: locale }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTranslated(data.translated)
      setShowTranslated(true)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  if (locale === 'ko') return null // Korean users don't need translation for Korean posts

  return (
    <div className={className}>
      <button
        onClick={() => {
          if (showTranslated) {
            setShowTranslated(false)
          } else {
            handleTranslate()
          }
        }}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors disabled:opacity-50"
      >
        <Languages size={12} />
        {loading ? labels.translating : showTranslated ? labels.original : labels.translate}
      </button>
      {error && <p className="text-xs text-red-500 mt-0.5">{labels.failed}</p>}
      {showTranslated && translated && (
        <div className="mt-1.5 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{translated}</p>
        </div>
      )}
    </div>
  )
}

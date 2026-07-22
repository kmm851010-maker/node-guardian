import ko from '@/locales/ko.json'
import en from '@/locales/en.json'
import zhTW from '@/locales/zh-TW.json'
import vi from '@/locales/vi.json'

export type Locale = 'ko' | 'en' | 'zh-TW' | 'vi'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'vi', label: 'Tiếng Việt' },
]

const messages: Record<Locale, Record<string, any>> = { ko, en, 'zh-TW': zhTW, vi }

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages.ko
}

// Get nested key like "app.tabs.dashboard"
export function t(msgs: Record<string, any>, key: string, params?: Record<string, string | number>): string {
  const parts = key.split('.')
  let val: any = msgs
  for (const p of parts) {
    val = val?.[p]
    if (val === undefined) return key
  }
  if (typeof val !== 'string') return key
  if (params) {
    return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
  }
  return val
}

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'ko'
  const saved = localStorage.getItem('pilink_locale')
  if (saved && messages[saved as Locale]) return saved as Locale
  const lang = navigator.language
  if (lang.startsWith('vi')) return 'vi'
  if (lang.startsWith('zh') && (lang.includes('TW') || lang.includes('Hant'))) return 'zh-TW'
  if (lang.startsWith('en')) return 'en'
  return 'ko'
}

'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { Locale, getMessages, t as translate, detectLocale } from '@/lib/i18n'

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'ko',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    setLocaleState(detectLocale())
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('pilink_locale', l)
  }, [])

  const msgs = useMemo(() => getMessages(locale), [locale])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(msgs, key, params)
  }, [msgs])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

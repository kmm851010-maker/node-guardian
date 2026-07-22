'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Smartphone, Monitor, Download, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'
import { getGuideTexts } from '@/locales/guide'

const DOWNLOAD_URL = 'https://github.com/kmm851010-maker/node-guardian/releases/download/v1.3.1/NodeGuardian.exe'

type GuideTab = 'pi' | 'pc'

interface Props {
  onClose?: () => void
  fullPage?: boolean
}

export function GuideBanner({ onClose, fullPage = false }: Props) {
  const { locale } = useI18n()
  const g = getGuideTexts(locale)
  const [tab, setTab] = useState<GuideTab>('pc')
  const [expanded, setExpanded] = useState<number | null>(null)

  const steps = tab === 'pi' ? g.piSteps : g.pcSteps

  return (
    <div className={`bg-white ${fullPage ? '' : 'rounded-2xl border shadow-lg'} overflow-hidden`}>
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">📱 {g.header}</h2>
            <p className="text-xs text-violet-200 mt-0.5">{g.headerSub}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setTab('pc'); setExpanded(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === 'pc' ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Monitor size={13} /> {g.tabPc}
          </button>
          <button
            onClick={() => { setTab('pi'); setExpanded(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === 'pi' ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Smartphone size={13} /> {g.tabPi}
          </button>
        </div>
      </div>

      <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${tab === 'pi' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
        {tab === 'pi' ? (
          <><Smartphone size={12} /> <span><b>{g.tabPiDesc}</b></span></>
        ) : (
          <><Monitor size={12} /> <span><b>{g.tabPcDesc}</b></span></>
        )}
      </div>

      {tab === 'pc' && (
        <div className="hidden md:block px-4 py-3 bg-violet-50 border-b">
          <a
            href={DOWNLOAD_URL}
            className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors active:scale-95"
          >
            <Download size={16} />
            {g.download}
          </a>
          <p className="text-xs text-center text-muted-foreground mt-1.5">{g.downloadNote}</p>
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                expanded === i ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'
              }`}>
                {i + 1}
              </span>
              <span className="text-sm font-medium flex-1">{step.title}</span>
              {expanded === i
                ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-2 bg-muted/10">
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {step.code && (
                  <pre className="text-xs bg-gray-900 text-green-400 rounded-lg px-3 py-2.5 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {step.code}
                  </pre>
                )}
                {step.note && (
                  <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">{step.note}</p>
                  </div>
                )}
                {step.warn && (
                  <div className="flex items-start gap-2 bg-yellow-50 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-700 leading-relaxed">{step.warn}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-muted/30 border-t text-center">
        <p className="text-xs text-muted-foreground">{g.footer}</p>
      </div>
    </div>
  )
}

export default function GuideDrawer() {
  const { locale } = useI18n()
  const g = getGuideTexts(locale)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem('guide_banner_seen')
    if (!seen) setDismissed(false)
  }, [])

  const dismiss = () => {
    localStorage.setItem('guide_banner_seen', '1')
    setDismissed(true)
  }

  return (
    <>
      {!dismissed && (
        <div className="mx-4 mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-2xl">👋</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-800">{g.firstVisit}</p>
              <p className="text-xs text-violet-600">{g.firstVisitSub}</p>
            </div>
            <button onClick={dismiss} className="p-1 text-violet-400 hover:text-violet-600"><X size={16} /></button>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => { setOpen(true); dismiss() }}
              className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              📖 {g.viewGuide}
            </button>
            <button onClick={dismiss} className="px-4 py-2 bg-white border border-violet-200 rounded-xl text-sm text-violet-600 hover:bg-violet-50 transition-colors">
              {g.later}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-violet-600 text-white rounded-full shadow-lg flex items-center gap-1.5 px-3 py-2 hover:bg-violet-700 transition-colors active:scale-95"
      >
        <HelpCircle size={15} />
        <span className="text-xs font-bold">{g.guide}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <GuideBanner onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

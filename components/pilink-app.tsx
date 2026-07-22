'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, Users, Trophy, MessageCircle, LogIn, LogOut, UserCircle, Download, BookOpen, Smartphone, RefreshCw, Globe } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useI18n } from '@/contexts/i18n-context'
import { LOCALES, Locale } from '@/lib/i18n'
import DashboardTab from './tabs/dashboard-tab'
import CommunityTab from './tabs/community-tab'
import RankingTab from './tabs/ranking-tab'
import QnaTab from './tabs/qna-tab'
import ProfileTab from './tabs/profile-tab'
import GuideDrawer from './guide-banner'

type Tab = 'dashboard' | 'community' | 'ranking' | 'qna' | 'profile'

const TAB_ICONS: Record<Tab, typeof Monitor> = {
  dashboard: Monitor,
  community: Users,
  ranking: Trophy,
  qna: MessageCircle,
  profile: UserCircle,
}

const PI_TAB_IDS: Tab[] = ['dashboard', 'community', 'ranking', 'qna', 'profile']
const WEB_TAB_IDS: Tab[] = ['community', 'ranking', 'qna']

export default function PiLinkApp() {
  const { t, locale, setLocale } = useI18n()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('community')
  const { user, isLoading, login, logout } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [isPiBrowser, setIsPiBrowser] = useState<boolean | null>(null)
  const [isAndroidBrowser, setIsAndroidBrowser] = useState(false)
  const [apkUrl, setApkUrl] = useState('https://github.com/kmm851010-maker/linkpi-monitor-apk/releases/latest/download/LinkPiMonitor.apk')
  const [badges, setBadges] = useState<Partial<Record<Tab, boolean>>>({})
  const [profileSince, setProfileSince] = useState('1970-01-01T00:00:00.000Z')
  const [openPostRequest, setOpenPostRequest] = useState<{ postId: string; postType: string } | null>(null)
  const [badgeMap, setBadgeMap] = useState<Record<string, string[]>>({})
  const [roleMap, setRoleMap] = useState<Record<string, 'master' | 'staff'>>({})

  const [pullReady, setPullReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullReadyRef = useRef(false)

  useEffect(() => {
    setProfileSince(localStorage.getItem('lastSeen_profile') ?? '1970-01-01T00:00:00.000Z')
  }, [])

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startYRef.current = e.touches[0].clientY
      pullReadyRef.current = false
      setPullReady(false)
    }
    const onTouchMove = (e: TouchEvent) => {
      const dy = startYRef.current - e.touches[0].clientY
      const atBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 20
      const atTop = window.scrollY <= 0
      const ready = (atBottom && dy > 250) || (atTop && dy < -250)
      pullReadyRef.current = ready
      setPullReady(ready)
    }
    const onTouchEnd = () => {
      if (pullReadyRef.current) {
        setRefreshing(true)
        setPullReady(false)
        setTimeout(() => window.location.reload(), 700)
      } else {
        setPullReady(false)
      }
      pullReadyRef.current = false
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    fetch('/api/badges').then(r => r.json()).then(d => { setBadgeMap(d.badges ?? {}); setRoleMap(d.roleMap ?? {}) })
  }, [])

  useEffect(() => {
    const hasPiSDK = !!(window as any).Pi
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
    const isAndroid = /android/i.test(navigator.userAgent)
    const isPi = hasPiSDK && isMobile
    setIsPiBrowser(isPi)
    setIsAndroidBrowser(isAndroid)
    if (isPi) setActiveTab('dashboard')
    if (isAndroid) {
      fetch('/api/app-version').then(r => r.json()).then(d => { if (d.apk_url) setApkUrl(d.apk_url) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!user) { setIsPremium(false); return }
    fetch(`/api/premium?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(d => setIsPremium(d.isPremium ?? false))
    // Sync locale to DB on login
    const savedLocale = localStorage.getItem('pilink_locale')
    if (savedLocale) {
      fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid, locale: savedLocale }) }).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    const checkBadges = async () => {
      const lastSeenCommunity = localStorage.getItem('lastSeen_community') ?? '1970-01-01T00:00:00.000Z'
      const lastSeenQna = localStorage.getItem('lastSeen_qna') ?? '1970-01-01T00:00:00.000Z'

      const [communityRes, qnaRes] = await Promise.all([
        fetch('/api/posts?exclude_type=qna&limit=1'),
        fetch('/api/posts?type=qna&limit=1'),
      ])
      const communityData = await communityRes.json()
      const qnaData = await qnaRes.json()

      const latestCommunity = communityData.data?.[0]?.created_at ?? ''
      const latestQna = qnaData.data?.[0]?.created_at ?? ''

      const next: Partial<Record<Tab, boolean>> = {
        community: !!latestCommunity && latestCommunity > lastSeenCommunity,
        qna: !!latestQna && latestQna > lastSeenQna,
      }

      if (user) {
        const lastSeenProfile = localStorage.getItem('lastSeen_profile') ?? '1970-01-01T00:00:00.000Z'
        const [attendanceRes, claimRes, premiumRes, notifRes] = await Promise.all([
          fetch(`/api/attendance?pi_uid=${user.uid}`),
          fetch(`/api/rankings/claim?pi_uid=${user.uid}`),
          fetch(`/api/premium?pi_uid=${user.uid}`),
          fetch(`/api/notifications?pi_uid=${encodeURIComponent(user.uid)}&username=${encodeURIComponent(user.username)}&since=${encodeURIComponent(lastSeenProfile)}`),
        ])
        const attendance = await attendanceRes.json()
        const claimStatus = await claimRes.json()
        const premium = await premiumRes.json()
        const notif = await notifRes.json()

        let profileBadge = false
        if (!attendance.checked_today) profileBadge = true
        if (claimStatus.claimable) profileBadge = true
        if (notif.hasNew) profileBadge = true
        if (premium.isPremium && premium.expires_at) {
          const days = Math.ceil((new Date(premium.expires_at).getTime() - Date.now()) / 86400000)
          if (days <= 7) profileBadge = true
        }
        next.profile = profileBadge
      }

      setBadges(next)
    }

    checkBadges()
  }, [user])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    const now = new Date().toISOString()
    if (tab === 'community') {
      localStorage.setItem('lastSeen_community', now)
      setBadges(prev => ({ ...prev, community: false }))
    } else if (tab === 'qna') {
      localStorage.setItem('lastSeen_qna', now)
      setBadges(prev => ({ ...prev, qna: false }))
    } else if (tab === 'profile') {
      // 현재 값을 ProfileTab에 전달한 뒤 localStorage 갱신
      setProfileSince(localStorage.getItem('lastSeen_profile') ?? '1970-01-01T00:00:00.000Z')
      localStorage.setItem('lastSeen_profile', now)
      setBadges(prev => ({ ...prev, profile: false }))
    }
  }

  const handleNavigateToPost = (postId: string, postType: string) => {
    const tab: Tab = postType === 'qna' ? 'qna' : 'community'
    handleTabChange(tab)
    setOpenPostRequest({ postId, postType })
  }

  const tabIds = isPiBrowser ? PI_TAB_IDS : WEB_TAB_IDS

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-2">
        <span className="text-xl font-bold text-violet-600">LinkPi</span>
        <span className="text-xs text-muted-foreground flex-1">{t('app.title')}</span>
        {/* PC 전용: 다운로드 & 가이드 버튼 */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/guide"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <BookOpen size={14} />
            {t('app.guide')}
          </a>
          <a
            href="https://github.com/kmm851010-maker/node-guardian/releases/download/v1.3.1/NodeGuardian.exe"
            className="flex items-center gap-1 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full hover:bg-violet-700 transition-colors"
          >
            <Download size={14} />
            {t('app.download')}
          </a>
        </div>
        {/* 언어 선택 */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border hover:bg-muted transition-colors"
          >
            <Globe size={13} />
            <span className="font-medium">{locale === 'zh-TW' ? '繁中' : LOCALES.find(l => l.code === locale)?.label ?? locale}</span>
          </button>
          {showLangMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowLangMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-30 py-1 min-w-[120px]">
                {LOCALES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code); setShowLangMenu(false)
                      if (user) fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid, locale: l.code }) }).catch(() => {})
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${locale === l.code ? 'text-violet-600 font-semibold' : ''}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {isPiBrowser === true && !isLoading && (
          user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">@{user.username}</span>
              <button onClick={logout} className="text-muted-foreground hover:text-foreground">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full hover:bg-violet-700 transition-colors"
            >
              <LogIn size={14} />
              {t('app.login')}
            </button>
          )
        )}
      </header>

      {/* 비Pi브라우저 안내 배너 */}
      {isPiBrowser === false && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Smartphone size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">{t('app.notPiBrowser')}</span>
            <br />{t('app.notPiBrowserSub')}
          </p>
        </div>
      )}

      {/* 안드로이드 앱 다운로드 배너 (모바일 브라우저 전용, Pi Browser·PC 제외) */}
      {isAndroidBrowser && (
        <div className="mx-4 mt-2 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <Download size={16} className="text-violet-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-violet-800">{t('app.androidBanner')}</p>
            <p className="text-xs text-violet-600 mt-0.5">{t('app.androidBannerSub')}</p>
          </div>
          <a
            href={apkUrl}
            className="shrink-0 bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            {t('app.installApp')}
          </a>
        </div>
      )}

      {/* 탭 컨텐츠 */}
      <main className="pb-20">
        {isPiBrowser === true && activeTab === 'dashboard' && <GuideDrawer />}
        {activeTab === 'dashboard'  && <DashboardTab user={user} />}
        {activeTab === 'community'  && <CommunityTab user={user} isPremium={isPremium} badgeMap={badgeMap} roleMap={roleMap} openPostId={openPostRequest?.postType !== 'qna' ? openPostRequest?.postId : undefined} onPostOpened={() => setOpenPostRequest(null)} />}
        {activeTab === 'ranking'    && <RankingTab user={user} roleMap={roleMap} />}
        {activeTab === 'qna'        && <QnaTab user={user} isPremium={isPremium} badgeMap={badgeMap} roleMap={roleMap} openPostId={openPostRequest?.postType === 'qna' ? openPostRequest?.postId : undefined} onPostOpened={() => setOpenPostRequest(null)} />}
        {activeTab === 'profile'    && <ProfileTab user={user} onPremiumChange={setIsPremium} notifSince={profileSince} onNavigateToPost={handleNavigateToPost} />}
      </main>

      {/* 오버스크롤 준비 인디케이터 */}
      {pullReady && !refreshing && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-xs px-4 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-1.5">
          <RefreshCw size={12} /> {t('app.pullToRefresh')}
        </div>
      )}

      {/* 새로고침 애니메이션 오버레이 */}
      {refreshing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
          <RefreshCw size={36} className="text-violet-600 animate-spin" />
          <p className="mt-3 text-sm font-medium text-violet-700">{t('app.refreshing')}</p>
        </div>
      )}

      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border-t flex">
        {tabIds.map(id => {
          const Icon = TAB_ICONS[id]
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                activeTab === id
                  ? 'text-violet-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="relative">
                <Icon size={20} />
                {badges[id] && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              {t(`app.tabs.${id}`)}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

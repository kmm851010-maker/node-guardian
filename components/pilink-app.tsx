'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, Users, Trophy, MessageCircle, LogIn, LogOut, UserCircle, Download, BookOpen, Smartphone, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import DashboardTab from './tabs/dashboard-tab'
import CommunityTab from './tabs/community-tab'
import RankingTab from './tabs/ranking-tab'
import QnaTab from './tabs/qna-tab'
import ProfileTab from './tabs/profile-tab'
import GuideDrawer from './guide-banner'

type Tab = 'dashboard' | 'community' | 'ranking' | 'qna' | 'profile'

const PI_TABS = [
  { id: 'dashboard' as Tab, label: '대시보드', icon: Monitor },
  { id: 'community' as Tab, label: '커뮤니티', icon: Users },
  { id: 'ranking' as Tab, label: '랭킹', icon: Trophy },
  { id: 'qna' as Tab, label: 'QnA', icon: MessageCircle },
  { id: 'profile' as Tab, label: '프로필', icon: UserCircle },
]

const WEB_TABS = [
  { id: 'community' as Tab, label: '커뮤니티', icon: Users },
  { id: 'ranking' as Tab, label: '랭킹', icon: Trophy },
  { id: 'qna' as Tab, label: 'QnA', icon: MessageCircle },
]

export default function PiLinkApp() {
  const [activeTab, setActiveTab] = useState<Tab>('community')
  const { user, isLoading, login, logout } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [isPiBrowser, setIsPiBrowser] = useState<boolean | null>(null)
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
      const ready = (atBottom && dy > 150) || (atTop && dy < -150)
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
    const isPi = hasPiSDK && isMobile
    setIsPiBrowser(isPi)
    if (isPi) setActiveTab('dashboard')
  }, [])

  useEffect(() => {
    if (!user) { setIsPremium(false); return }
    fetch(`/api/premium?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(d => setIsPremium(d.isPremium ?? false))
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

  const tabs = isPiBrowser ? PI_TABS : WEB_TABS

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-2">
        <span className="text-xl font-bold text-violet-600">LinkPi</span>
        <span className="text-xs text-muted-foreground flex-1">실시간 노드 모니터링 & 커뮤니티</span>
        {/* PC 전용: 다운로드 & 가이드 버튼 */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/guide"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <BookOpen size={14} />
            사용법
          </a>
          <a
            href="https://github.com/kmm851010-maker/node-guardian/releases/latest/download/NodeGuardian.exe"
            className="flex items-center gap-1 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full hover:bg-violet-700 transition-colors"
          >
            <Download size={14} />
            프로그램 다운로드
          </a>
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
              Pi 로그인
            </button>
          )
        )}
      </header>

      {/* 비Pi브라우저 안내 배너 */}
      {isPiBrowser === false && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Smartphone size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">로그인 및 커뮤니티 참여는 Pi Browser에서만 가능합니다.</span>
            <br />게시글·댓글 조회는 이 브라우저에서도 가능합니다.
          </p>
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
          <RefreshCw size={12} /> 손 떼면 새로고침
        </div>
      )}

      {/* 새로고침 애니메이션 오버레이 */}
      {refreshing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
          <RefreshCw size={36} className="text-violet-600 animate-spin" />
          <p className="mt-3 text-sm font-medium text-violet-700">새로고침 중...</p>
        </div>
      )}

      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border-t flex">
        {tabs.map(({ id, label, icon: Icon }) => (
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
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

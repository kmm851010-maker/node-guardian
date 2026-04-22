'use client'

import { useState } from 'react'
import { Monitor, Users, Trophy, MessageCircle, LogIn, LogOut, UserCircle, Download, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import DashboardTab from './tabs/dashboard-tab'
import CommunityTab from './tabs/community-tab'
import RankingTab from './tabs/ranking-tab'
import QnaTab from './tabs/qna-tab'
import ProfileTab from './tabs/profile-tab'

type Tab = 'dashboard' | 'community' | 'ranking' | 'qna' | 'profile'

const TABS = [
  { id: 'dashboard' as Tab, label: '대시보드', icon: Monitor },
  { id: 'community' as Tab, label: '커뮤니티', icon: Users },
  { id: 'ranking' as Tab, label: '랭킹', icon: Trophy },
  { id: 'qna' as Tab, label: 'QnA', icon: MessageCircle },
  { id: 'profile' as Tab, label: '프로필', icon: UserCircle },
]

export default function PiLinkApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { user, isLoading, login, logout } = useAuth()

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-2">
        <span className="text-xl font-bold text-violet-600">LinkPi</span>
        <span className="text-xs text-muted-foreground flex-1">Pi Node 운영자 커뮤니티</span>
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
        {!isLoading && (
          user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">@{user.username}</span>
              <button onClick={logout} className="text-muted-foreground hover:text-foreground">
                <LogOut size={16} />
              </button>
            </div>
          ) : typeof window !== 'undefined' && window.Pi ? (
            <button
              onClick={login}
              className="flex items-center gap-1 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full hover:bg-violet-700 transition-colors"
            >
              <LogIn size={14} />
              Pi 로그인
            </button>
          ) : null
        )}
      </header>

      {/* 탭 컨텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard'  && <DashboardTab user={user} />}
        {activeTab === 'community'  && <CommunityTab user={user} />}
        {activeTab === 'ranking'    && <RankingTab />}
        {activeTab === 'qna'        && <QnaTab user={user} />}
        {activeTab === 'profile'    && <ProfileTab user={user} />}
      </main>

      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border-t flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
              activeTab === id
                ? 'text-violet-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

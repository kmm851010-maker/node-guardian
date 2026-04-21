'use client'

import { useState } from 'react'
import { Monitor, Users, Trophy, MessageCircle } from 'lucide-react'
import DashboardTab from './tabs/dashboard-tab'
import CommunityTab from './tabs/community-tab'
import RankingTab from './tabs/ranking-tab'
import QnaTab from './tabs/qna-tab'

type Tab = 'dashboard' | 'community' | 'ranking' | 'qna'

const TABS = [
  { id: 'dashboard' as Tab, label: '대시보드', icon: Monitor },
  { id: 'community' as Tab, label: '커뮤니티', icon: Users },
  { id: 'ranking' as Tab, label: '랭킹', icon: Trophy },
  { id: 'qna' as Tab, label: 'QnA', icon: MessageCircle },
]

export default function PiLinkApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-2">
        <span className="text-xl font-bold text-violet-600">PiLink</span>
        <span className="text-xs text-muted-foreground">Pi Node 운영자 커뮤니티</span>
      </header>

      {/* 탭 컨텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard'  && <DashboardTab />}
        {activeTab === 'community'  && <CommunityTab />}
        {activeTab === 'ranking'    && <RankingTab />}
        {activeTab === 'qna'        && <QnaTab />}
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

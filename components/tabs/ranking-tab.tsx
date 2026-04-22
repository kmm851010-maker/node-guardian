'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Heart, Crown, Info } from 'lucide-react'
import UserProfileModal from '@/components/user-profile-modal'

interface RankEntry {
  id: string
  week_start: string
  rank: number
  pi_uid: string
  nickname: string
  total_likes: number
  claimed: boolean
}

const RANK_EMOJI = ['🥇', '🥈', '🥉']
const RANK_BG = [
  'bg-yellow-50 border-yellow-200',
  'bg-gray-50 border-gray-200',
  'bg-orange-50 border-orange-200',
]

function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart)
  const end = new Date(d.getTime() + 6 * 86400000)
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${weekStart.slice(0, 4)}년 ${fmt(d)} ~ ${fmt(end)}`
}

interface Props {
  user: { uid: string; username: string } | null
}

export default function RankingTab({ user }: Props) {
  const [rankings, setRankings] = useState<RankEntry[]>([])
  const [weekStart, setWeekStart] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [profileUid, setProfileUid] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rankings')
      .then(r => r.json())
      .then(d => {
        setRankings(d.data ?? [])
        setWeekStart(d.weekStart ?? '')
        setLoading(false)
      })
  }, [])

  const nextSunday = (() => {
    if (!weekStart) return ''
    const d = new Date(weekStart)
    const next = new Date(d.getTime() + 7 * 86400000)
    return `${next.getMonth() + 1}월 ${next.getDate()}일 일요일`
  })()

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-4">
      {profileUid && (
        <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      )}

      {/* 안내 카드 */}
      <Card className="bg-violet-50 border-violet-200">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-violet-500 mt-0.5 shrink-0" />
            <div className="text-xs text-violet-700 space-y-0.5">
              <p className="font-semibold">주간 인기 랭킹 🏆</p>
              <p>커뮤니티 & QnA 게시글·댓글의 좋아요 합산으로 매주 1~10위를 선정합니다.</p>
              <p>선정된 분께는 <span className="font-bold">10 Test Pi</span> 상금이 지급됩니다.</p>
              {nextSunday && <p className="text-violet-500">다음 갱신: {nextSunday} 00:00 (KST)</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 랭킹 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            {weekStart ? `이번 주 랭킹 (${getWeekLabel(weekStart)})` : '이번 주 랭킹'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
              <Heart size={28} className="mx-auto opacity-30" />
              <p>아직 이번 주 랭킹이 없습니다.</p>
              <p className="text-xs">커뮤니티와 QnA에서 좋아요를 받아보세요!</p>
            </div>
          ) : (
            rankings.map(entry => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${RANK_BG[entry.rank - 1] ?? 'bg-muted/30 border-muted'}`}
              >
                <span className="text-xl w-8 text-center shrink-0">
                  {RANK_EMOJI[entry.rank - 1] ?? `${entry.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setProfileUid(entry.pi_uid)}
                    className="text-sm font-semibold hover:text-violet-600 hover:underline transition-colors truncate block text-left"
                  >
                    {entry.rank === 1 && <Crown size={12} className="inline text-yellow-500 mr-1" />}
                    @{entry.nickname}
                  </button>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Heart size={11} className="text-rose-400" fill="currentColor" />
                    <span className="font-medium text-rose-500">{entry.total_likes}</span>
                    <span>좋아요</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {entry.claimed ? (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">수령완료</span>
                  ) : (
                    <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-1 rounded-full">🎁 10π</span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 내 순위 안내 */}
      {user && rankings.length > 0 && (() => {
        const myEntry = rankings.find(r => r.pi_uid === user.uid)
        if (!myEntry) return (
          <Card className="border-dashed">
            <CardContent className="p-3 text-center text-xs text-muted-foreground">
              이번 주 아직 랭킹에 없습니다. 게시글과 댓글에 좋아요를 모아보세요!
            </CardContent>
          </Card>
        )
        return null
      })()}
    </div>
  )
}

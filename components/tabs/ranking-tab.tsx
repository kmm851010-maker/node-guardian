'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Heart, Crown, Info, Flame, Zap } from 'lucide-react'
import UserProfileModal from '@/components/user-profile-modal'
import { RoleName } from '@/components/role-name'

interface RankEntry {
  id: string
  week_start: string
  rank: number
  pi_uid: string
  nickname: string
  total_likes: number
  claimed: boolean
}

interface StreakEntry {
  rank: number
  pi_uid: string
  nickname: string
  display_name: string | null
  current: number
  max: number
}

interface AdoptionEntry {
  rank: number
  pi_uid: string
  nickname: string
  display_name: string | null
  count: number
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
  roleMap?: Record<string, 'master' | 'staff'>
}

type SubTab = 'weekly' | 'current' | 'alltime' | 'adoption'

export default function RankingTab({ user, roleMap = {} }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('weekly')
  const [rankings, setRankings] = useState<RankEntry[]>([])
  const [weekStart, setWeekStart] = useState<string>('')
  const [weeklyLoading, setWeeklyLoading] = useState(true)

  const [currentRanking, setCurrentRanking] = useState<StreakEntry[]>([])
  const [maxRanking, setMaxRanking] = useState<StreakEntry[]>([])
  const [streakLoading, setStreakLoading] = useState(false)
  const [streakLoaded, setStreakLoaded] = useState(false)

  const [adoptionRanking, setAdoptionRanking] = useState<AdoptionEntry[]>([])
  const [adoptionLoading, setAdoptionLoading] = useState(false)
  const [adoptionLoaded, setAdoptionLoaded] = useState(false)

  const [profileUid, setProfileUid] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rankings')
      .then(r => r.json())
      .then(d => {
        setRankings(d.data ?? [])
        setWeekStart(d.weekStart ?? '')
        setWeeklyLoading(false)
      })
  }, [])

  useEffect(() => {
    if ((subTab === 'current' || subTab === 'alltime') && !streakLoaded) {
      setStreakLoading(true)
      fetch('/api/rankings/streak')
        .then(r => r.json())
        .then(d => {
          setCurrentRanking(d.currentRanking ?? [])
          setMaxRanking(d.maxRanking ?? [])
          setStreakLoading(false)
          setStreakLoaded(true)
        })
    }
  }, [subTab, streakLoaded])

  useEffect(() => {
    if (subTab === 'adoption' && !adoptionLoaded) {
      setAdoptionLoading(true)
      fetch('/api/rankings/adoption')
        .then(r => r.json())
        .then(d => {
          setAdoptionRanking(d.ranking ?? [])
          setAdoptionLoading(false)
          setAdoptionLoaded(true)
        })
    }
  }, [subTab, adoptionLoaded])

  const nextSunday = (() => {
    if (!weekStart) return ''
    const d = new Date(weekStart)
    const next = new Date(d.getTime() + 7 * 86400000)
    return `${next.getMonth() + 1}월 ${next.getDate()}일 일요일`
  })()

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'weekly', label: '주간 인기멤버' },
    { key: 'current', label: '현재 연속출석' },
    { key: 'alltime', label: '역대 최장출석' },
    { key: 'adoption', label: '지식In' },
  ]

  const activeEntries = subTab === 'current' ? currentRanking : maxRanking

  return (
    <div className="p-4 space-y-4">
      {profileUid && (
        <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      )}

      {/* 서브탭 */}
      <div className="flex gap-2">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
              subTab === t.key
                ? 'bg-violet-600 text-white border-violet-600'
                : 'text-muted-foreground border-muted hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 주간 인기 */}
      {subTab === 'weekly' && (
        <>
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <div className="text-xs text-violet-700 space-y-0.5">
                  <p className="font-semibold">주간 인기 랭킹 🏆</p>
                  <p>커뮤니티 & QnA 게시글·댓글의 좋아요 합산으로 매주 1~10위를 선정합니다.</p>
                  <p>선정된 분께는 <span className="font-bold">프리미엄 1주일</span>이 즉시 지급됩니다.</p>
                  {nextSunday && <p className="text-violet-500">다음 갱신: {nextSunday} 00:00 (KST)</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                {weekStart ? `이번 주 랭킹 (${getWeekLabel(weekStart)})` : '이번 주 랭킹'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weeklyLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">불러오는 중...</div>
              ) : rankings.length === 0 ? (
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
                        <RoleName name={`@${entry.nickname}`} role={roleMap[entry.pi_uid]} />
                      </button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Heart size={11} className="text-rose-400" fill="currentColor" />
                        <span className="font-medium text-rose-500">{entry.total_likes}</span>
                        <span>좋아요</span>
                      </div>
                    </div>
                    {entry.claimed && (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full shrink-0">수령완료</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {user && rankings.length > 0 && !rankings.find(r => r.pi_uid === user.uid) && (
            <Card className="border-dashed">
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                이번 주 아직 랭킹에 없습니다. 게시글과 댓글에 좋아요를 모아보세요!
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 현재 연속 / 역대 최장 공통 */}
      {(subTab === 'current' || subTab === 'alltime') && (
        <>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
                <div className="text-xs text-orange-700 space-y-0.5">
                  {subTab === 'current' ? (
                    <>
                      <p className="font-semibold">현재 연속 출석 랭킹 🔥</p>
                      <p>오늘(또는 어제)부터 하루도 빠짐없이 연속 출석한 일수 기준입니다.</p>
                      <p>하루라도 빠지면 카운트가 초기화됩니다.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">역대 최장 연속 출석 랭킹 ⚡</p>
                      <p>지금까지 기록한 가장 긴 연속 출석 일수 기준입니다.</p>
                      <p>한 번 세운 기록은 영구적으로 보존됩니다.</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {subTab === 'current'
                  ? <Flame size={14} className="text-orange-500" />
                  : <Zap size={14} className="text-yellow-500" />}
                {subTab === 'current' ? '현재 연속 출석 TOP 10' : '역대 최장 기록 TOP 10'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {streakLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">불러오는 중...</div>
              ) : activeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Flame size={28} className="mx-auto opacity-30" />
                  <p>아직 데이터가 없습니다.</p>
                  <p className="text-xs">매일 출석체크를 해보세요!</p>
                </div>
              ) : (
                activeEntries.map(entry => {
                  const isMe = user?.uid === entry.pi_uid
                  const days = subTab === 'current' ? entry.current : entry.max
                  return (
                    <div
                      key={entry.pi_uid}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        RANK_BG[entry.rank - 1] ?? (isMe ? 'bg-violet-50 border-violet-200' : 'bg-muted/30 border-muted')
                      }`}
                    >
                      <span className="text-xl w-8 text-center shrink-0 font-bold">
                        {RANK_EMOJI[entry.rank - 1] ?? <span className="text-sm text-muted-foreground">{entry.rank}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setProfileUid(entry.pi_uid)}
                          className="text-sm font-semibold hover:text-violet-600 hover:underline transition-colors truncate block text-left"
                        >
                          {entry.rank === 1 && <Crown size={12} className="inline text-yellow-500 mr-1" />}
                          <RoleName name={entry.display_name ?? `@${entry.nickname}`} role={roleMap[entry.pi_uid]} />
                          {isMe && <span className="ml-1 text-xs text-violet-500 font-normal">(나)</span>}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {subTab === 'current'
                            ? <Flame size={11} className="text-orange-400" />
                            : <Zap size={11} className="text-yellow-500" />}
                          <span className="font-medium text-orange-500">{days}일</span>
                          <span>연속</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {user && !streakLoading && activeEntries.length > 0 && !activeEntries.find(e => e.pi_uid === user.uid) && (
            <Card className="border-dashed">
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                아직 랭킹에 없습니다. 매일 출석체크로 기록을 쌓아보세요!
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* 지식In */}
      {subTab === 'adoption' && (
        <>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 space-y-0.5">
                  <p className="font-semibold">지식In 랭킹 🎓</p>
                  <p>QnA에서 채택된 답변 수 기준입니다.</p>
                  <p>채택될수록 지식인으로 인정받습니다!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                채택 왕 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adoptionLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">불러오는 중...</div>
              ) : adoptionRanking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Trophy size={28} className="mx-auto opacity-30" />
                  <p>아직 채택된 답변이 없습니다.</p>
                  <p className="text-xs">QnA에서 좋은 답변을 달아보세요!</p>
                </div>
              ) : (
                adoptionRanking.map(entry => {
                  const isMe = user?.uid === entry.pi_uid
                  return (
                    <div
                      key={entry.pi_uid}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        RANK_BG[entry.rank - 1] ?? (isMe ? 'bg-violet-50 border-violet-200' : 'bg-muted/30 border-muted')
                      }`}
                    >
                      <span className="text-xl w-8 text-center shrink-0">
                        {RANK_EMOJI[entry.rank - 1] ?? entry.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setProfileUid(entry.pi_uid)}
                          className="text-sm font-semibold hover:text-violet-600 hover:underline transition-colors truncate block text-left"
                        >
                          {entry.rank === 1 && <Crown size={12} className="inline text-yellow-500 mr-1" />}
                          <RoleName name={entry.display_name ?? `@${entry.nickname}`} role={roleMap[entry.pi_uid]} />
                          {isMe && <span className="ml-1 text-xs text-violet-500 font-normal">(나)</span>}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span className="text-amber-500">🎓</span>
                          <span className="font-medium text-amber-600">{entry.count}회</span>
                          <span>채택</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {user && !adoptionLoading && adoptionRanking.length > 0 && !adoptionRanking.find(e => e.pi_uid === user.uid) && (
            <Card className="border-dashed">
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                아직 랭킹에 없습니다. QnA에서 좋은 답변으로 채택을 받아보세요!
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

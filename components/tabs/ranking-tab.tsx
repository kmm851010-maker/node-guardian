'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Heart, Crown, Info, Flame, Zap, Server } from 'lucide-react'
import UserProfileModal from '@/components/user-profile-modal'
import { RoleName } from '@/components/role-name'
import { useI18n } from '@/contexts/i18n-context'

interface RankEntry {
  id: string
  week_start: string
  rank: number
  pi_uid: string
  nickname: string
  total_likes: number
  best_answer_count: number
  comment_count: number
  view_score: number
  total_score: number
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

interface UptimeEntry {
  rank:        number
  pi_uid:      string
  nickname:    string
  uptime_7d:   number | null
  uptime_30d:  number | null
  streak_days: number
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
  return `${fmt(d)} ~ ${fmt(end)}`
}

interface Props {
  user: { uid: string; username: string } | null
  roleMap?: Record<string, 'master' | 'staff'>
}

type SubTab = 'weekly' | 'current' | 'alltime' | 'adoption' | 'uptime'

export default function RankingTab({ user, roleMap = {} }: Props) {
  const { t } = useI18n()
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

  const [uptimeRanking, setUptimeRanking] = useState<UptimeEntry[]>([])
  const [uptimeTotal, setUptimeTotal] = useState(0)
  const [uptimeAvg, setUptimeAvg] = useState<number | null>(null)
  const [uptimeLoading, setUptimeLoading] = useState(false)
  const [uptimeLoaded, setUptimeLoaded] = useState(false)

  const [profileUid, setProfileUid] = useState<string | null>(null)

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'weekly',   label: t('ranking.weeklyPopular') },
    { key: 'current',  label: t('ranking.currentStreak') },
    { key: 'alltime',  label: t('ranking.maxStreak') },
    { key: 'adoption', label: t('ranking.adoptionRanking') },
    { key: 'uptime',   label: t('ranking.uptimeRanking') },
  ]

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

  useEffect(() => {
    if (subTab === 'uptime' && !uptimeLoaded) {
      setUptimeLoading(true)
      fetch('/api/rankings/uptime')
        .then(r => r.json())
        .then(d => {
          setUptimeRanking(d.rankings ?? [])
          setUptimeTotal(d.total ?? 0)
          setUptimeAvg(d.average_7d ?? null)
          setUptimeLoading(false)
          setUptimeLoaded(true)
        })
    }
  }, [subTab, uptimeLoaded])

  const nextSundayLabel = (() => {
    if (!weekStart) return ''
    const d = new Date(weekStart)
    const next = new Date(d.getTime() + 7 * 86400000)
    return `${next.getMonth() + 1}/${next.getDate()} (${t('dashboard.sun')}) 00:00 KST`
  })()

  const activeEntries = subTab === 'current' ? currentRanking : maxRanking

  return (
    <div className="p-4 space-y-4">
      {profileUid && (
        <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      )}

      {/* Sub tabs */}
      <div className="flex gap-2">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
              subTab === tab.key
                ? 'bg-violet-600 text-white border-violet-600'
                : 'text-muted-foreground border-muted hover:bg-muted/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Weekly */}
      {subTab === 'weekly' && (
        <>
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-violet-500 mt-0.5 shrink-0" />
                <div className="text-xs text-violet-700 space-y-0.5">
                  <p className="font-semibold">{t('ranking.weeklyPopular')} 🏆</p>
                  <p>{t('ranking.weeklyInfo')}</p>
                  <p className="text-violet-600">❤️ {t('ranking.weeklyScoring')}</p>
                  <p>{t('ranking.weeklyReward')}</p>
                  {nextSundayLabel && <p className="text-violet-500">{t('ranking.nextUpdate', { date: nextSundayLabel })}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                {weekStart ? `${t('ranking.thisWeek')} (${getWeekLabel(weekStart)})` : t('ranking.thisWeek')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weeklyLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('profile.loading')}</div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Heart size={28} className="mx-auto opacity-30" />
                  <p>{t('ranking.noData')}</p>
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {entry.total_likes > 0 && <span>❤️ {entry.total_likes}</span>}
                        {entry.best_answer_count > 0 && <span>🎓 {entry.best_answer_count}</span>}
                        {entry.comment_count > 0 && <span>💬 {entry.comment_count}</span>}
                        {entry.view_score > 0 && <span>👁 {entry.view_score * 10}</span>}
                      </div>
                    </div>
                    {entry.claimed && (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full shrink-0">{t('ranking.claimed')}</span>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {user && rankings.length > 0 && !rankings.find(r => r.pi_uid === user.uid) && (
            <Card className="border-dashed">
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                {t('ranking.notRankedWeekly')}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Current / All-time streak */}
      {(subTab === 'current' || subTab === 'alltime') && (
        <>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
                <div className="text-xs text-orange-700 space-y-0.5">
                  {subTab === 'current' ? (
                    <>
                      <p className="font-semibold">{t('ranking.currentStreak')} 🔥</p>
                      <p>{t('ranking.currentStreakInfo')}</p>
                      <p>{t('ranking.currentStreakReset')}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{t('ranking.maxStreak')} ⚡</p>
                      <p>{t('ranking.maxStreakInfo')}</p>
                      <p>{t('ranking.maxStreakKeep')}</p>
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
                {subTab === 'current' ? t('ranking.currentTop10') : t('ranking.maxTop10')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {streakLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('profile.loading')}</div>
              ) : activeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Flame size={28} className="mx-auto opacity-30" />
                  <p>{t('ranking.noStreakData')}</p>
                  <p className="text-xs">{t('ranking.noStreakTip')}</p>
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
                          {isMe && <span className="ml-1 text-xs text-violet-500 font-normal">{t('ranking.me')}</span>}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          {subTab === 'current'
                            ? <Flame size={11} className="text-orange-400" />
                            : <Zap size={11} className="text-yellow-500" />}
                          <span className="font-medium text-orange-500">{t('ranking.daysConsecutive', { days })}</span>
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
                {t('ranking.notRankedStreak')}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Adoption */}
      {subTab === 'adoption' && (
        <>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 space-y-0.5">
                  <p className="font-semibold">{t('ranking.adoptionRanking')} 🎓</p>
                  <p>{t('ranking.adoptionInfo')}</p>
                  <p>{t('ranking.adoptionRecognize')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                {t('ranking.adoptionTop10')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adoptionLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('profile.loading')}</div>
              ) : adoptionRanking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Trophy size={28} className="mx-auto opacity-30" />
                  <p>{t('ranking.noAdoption')}</p>
                  <p className="text-xs">{t('ranking.noAdoptionTip')}</p>
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
                          {isMe && <span className="ml-1 text-xs text-violet-500 font-normal">{t('ranking.me')}</span>}
                        </button>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span className="text-amber-500">🎓</span>
                          <span className="font-medium text-amber-600">{t('ranking.adoptionCount', { count: entry.count })}</span>
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
                {t('ranking.notRankedAdoption')}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Uptime */}
      {subTab === 'uptime' && (
        <>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-green-600 mt-0.5 shrink-0" />
                <div className="text-xs text-green-800 space-y-0.5">
                  <p className="font-semibold">{t('ranking.uptimeRanking')} 🖥️</p>
                  <p>{t('ranking.uptimeInfo')}</p>
                  <p>{t('ranking.uptimeDetail')}</p>
                  <p>{t('ranking.uptimeNote')}</p>
                  {uptimeTotal > 0 && uptimeAvg !== null && (
                    <p className="text-green-700">{t('ranking.uptimeAvg', { total: uptimeTotal, avg: uptimeAvg.toFixed(1) })}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server size={14} className="text-green-600" />
                {t('ranking.uptimeTop50')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {uptimeLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('profile.loading')}</div>
              ) : uptimeRanking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                  <Server size={28} className="mx-auto opacity-30" />
                  <p>{t('ranking.noUptimeData')}</p>
                  <p className="text-xs">{t('ranking.noUptimeTip')}</p>
                </div>
              ) : (
                uptimeRanking.map(entry => {
                  const isMe = user?.uid === entry.pi_uid
                  const pct7  = entry.uptime_7d  ?? 0
                  const pct30 = entry.uptime_30d ?? null
                  const barColor = pct7 >= 99 ? 'bg-green-500' : pct7 >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                  return (
                    <div
                      key={entry.pi_uid}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        RANK_BG[entry.rank - 1] ?? (isMe ? 'bg-violet-50 border-violet-200' : 'bg-muted/30 border-muted')
                      }`}
                    >
                      <span className="text-xl w-8 text-center shrink-0">
                        {RANK_EMOJI[entry.rank - 1] ?? <span className="text-sm text-muted-foreground font-bold">{entry.rank}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => setProfileUid(entry.pi_uid)}
                          className="text-sm font-semibold hover:text-violet-600 hover:underline transition-colors truncate block text-left"
                        >
                          {entry.rank === 1 && <Crown size={12} className="inline text-yellow-500 mr-1" />}
                          <RoleName name={`@${entry.nickname}`} role={roleMap[entry.pi_uid]} />
                          {isMe && <span className="ml-1 text-xs text-violet-500 font-normal">{t('ranking.me')}</span>}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct7}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${pct7 >= 99 ? 'text-green-600' : pct7 >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pct7.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {pct30 !== null && <span>{t('ranking.days30', { pct: pct30.toFixed(1) })}</span>}
                          {entry.streak_days > 0 && (
                            <span className="text-green-600 font-medium">· {t('ranking.streakRunning', { days: entry.streak_days })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

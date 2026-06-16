'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Cpu, BarChart2, CalendarDays } from 'lucide-react'

interface NodeEvent {
  id: string
  pi_uid: string
  event_type: string
  severity: string
  message: string
  created_at: string
}

interface NodeStatus {
  process_status: string
  port_status: string
  last_seen: string
  port_detail: Record<string, boolean> | null
}

interface DayData {
  date: string
  worst: string
  uptime: number
  hasData: boolean
}

interface NodeStats {
  uptime_7d:  number | null
  uptime_30d: number | null
  daily:   DayData[]
  monthly: DayData[]
  event_counts: Record<string, number>
}

interface UptimeComparison {
  average_7d:  number | null
  average_30d: number | null
  my_rank:     number | null
  my_top_pct:  number | null
  total:       number
}

const severityColor: Record<string, string> = {
  info:     'bg-blue-100 text-blue-700',
  warning:  'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
  recovery: 'bg-green-100 text-green-700',
}

const severityLabel: Record<string, string> = {
  info: '정보', warning: '경고', critical: '위험', recovery: '복구',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function dayLabel(isoDate: string) {
  const d = new Date(isoDate)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[d.getDay()]
}

function isStale(lastSeen: string) {
  return (Date.now() - new Date(lastSeen).getTime()) > 10 * 60 * 1000 // 10분
}

const statusBadge = (status: string) => {
  if (status === 'healthy') return <Badge className="bg-green-500 text-white">정상</Badge>
  if (status === 'warning') return <Badge className="bg-yellow-500 text-white">경고</Badge>
  if (status === 'critical') return <Badge variant="destructive">중단</Badge>
  return <Badge variant="secondary">알 수 없음</Badge>
}

const dayColor: Record<string, string> = {
  healthy:  'bg-green-400',
  warning:  'bg-yellow-400',
  critical: 'bg-red-500',
}

export default function DashboardTab({ user }: { user: { uid: string; username: string } | null }) {
  const [events, setEvents] = useState<NodeEvent[]>([])
  const [status, setStatus] = useState<NodeStatus | null>(null)
  const [stats, setStats] = useState<NodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [calendarMode, setCalendarMode] = useState(false)
  const [uptimeCmp, setUptimeCmp] = useState<UptimeComparison | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    Promise.all([
      fetch(`/api/node-events?pi_uid=${encodeURIComponent(user.username)}&limit=20&offset=0`).then(r => r.json()),
      fetch(`/api/node-status?pi_uid=${encodeURIComponent(user.username)}`).then(r => r.json()),
      fetch(`/api/node-stats?pi_uid=${encodeURIComponent(user.username)}`).then(r => r.json()),
      fetch(`/api/rankings/uptime?my_uid=${encodeURIComponent(user.uid)}`).then(r => r.json()),
    ]).then(([eventData, statusData, statsData, cmpData]) => {
      setEvents(eventData.data ?? [])
      setHasMore((eventData.data ?? []).length === 20)
      setOffset(20)
      setStatus(statusData.data ?? null)
      setStats(statsData)
      setUptimeCmp(cmpData)
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user || !sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        fetch(`/api/node-events?pi_uid=${encodeURIComponent(user.username)}&limit=20&offset=${offset}`)
          .then(r => r.json())
          .then(data => {
            const more = data.data ?? []
            setEvents(prev => [...prev, ...more])
            setHasMore(more.length === 20)
            setOffset(prev => prev + 20)
            setLoadingMore(false)
          })
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [user, hasMore, loadingMore, offset])

  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Pi 로그인 후 이용 가능합니다.
      </div>
    )
  }

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-4">
      {/* 내 노드 현재 상태 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu size={14} className="text-violet-500" /> 내 노드 상태
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">노드 프로세스</span>
                  {statusBadge(status.process_status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  마지막 신호: {timeAgo(status.last_seen)}
                </p>

              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Node Guardian 앱을 설치하면 상태가 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 주간 통계 */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 size={14} className="text-violet-500" /> 가동률
              <button
                onClick={() => setCalendarMode(m => !m)}
                className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  calendarMode
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'text-muted-foreground border-muted hover:bg-muted/50'
                }`}
              >
                <CalendarDays size={11} />
                {calendarMode ? '바차트' : '캘린더'}
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 7일 가동률 바 */}
            {[
              { label: '최근 7일', value: stats.uptime_7d },
              { label: '최근 30일', value: stats.uptime_30d },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`text-sm font-bold ${
                    value === null ? 'text-muted-foreground'
                    : value >= 99 ? 'text-green-600'
                    : value >= 95 ? 'text-yellow-600'
                    : 'text-red-600'
                  }`}>
                    {value === null ? '—' : `${value.toFixed(1)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      value === null ? 'bg-gray-200'
                      : value >= 99 ? 'bg-green-500'
                      : value >= 95 ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }`}
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}

            {/* 7일 바차트 / 월 캘린더 토글 */}
            {!calendarMode ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">최근 7일</p>
                <div className="grid grid-cols-7 gap-1">
                  {stats.daily.map(d => (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div className={`w-full h-8 rounded flex items-center justify-center ${d.hasData ? (dayColor[d.worst] ?? 'bg-gray-200') : 'bg-gray-100'}`}>
                        <span className={`text-[9px] font-bold leading-none ${d.hasData ? 'text-white drop-shadow' : 'text-gray-400'}`}>
                          {d.hasData ? `${d.uptime.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{dayLabel(d.date)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> 정상
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> 경고
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> 중단
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const monthly = stats.monthly ?? []
                  if (!monthly.length) return <p className="text-xs text-muted-foreground text-center py-2">데이터 없음</p>
                  const firstDate = new Date(monthly[0].date)
                  const year  = firstDate.getFullYear()
                  const month = firstDate.getMonth()
                  const firstDow = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const dayMap: Record<string, DayData> = {}
                  for (const d of monthly) dayMap[parseInt(d.date.slice(8), 10)] = d

                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">{year}년 {month + 1}월</p>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['일','월','화','수','목','금','토'].map(d => (
                          <div key={d} className="text-[10px] text-muted-foreground py-0.5">{d}</div>
                        ))}
                        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                          const data = dayMap[d]
                          const bg = !data
                            ? 'bg-gray-100 text-gray-300'
                            : data.worst === 'critical' ? 'bg-red-400 text-white'
                            : data.worst === 'warning'  ? 'bg-yellow-400 text-white'
                            : data.hasData ? 'bg-green-400 text-white'
                            : 'bg-gray-100 text-gray-400'
                          return (
                            <div key={d} className={`rounded text-[9px] font-bold py-1 ${bg}`}>
                              <div>{d}</div>
                              {data?.hasData && <div>{data.uptime.toFixed(0)}%</div>}
                              {!data?.hasData && data && <div>-</div>}
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> 정상
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> 경고
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> 중단
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* 전체 노드 대비 비교 */}
            {uptimeCmp && stats.uptime_7d !== null && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 space-y-1.5">
                <p className="text-xs font-semibold text-violet-700">전체 노드 대비 (7일 기준)</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-violet-600 font-medium">내 노드</span>
                      <span className="font-bold text-violet-700">{stats.uptime_7d.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-violet-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${stats.uptime_7d}%` }} />
                    </div>
                  </div>
                </div>
                {uptimeCmp.average_7d !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">전체 평균</span>
                        <span className="text-muted-foreground">{uptimeCmp.average_7d.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-gray-400" style={{ width: `${uptimeCmp.average_7d}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {uptimeCmp.my_rank !== null && (
                  <p className="text-xs text-center text-violet-600 font-medium pt-0.5">
                    {uptimeCmp.total}개 노드 중 {uptimeCmp.my_rank}위 · 상위 {uptimeCmp.my_top_pct}%
                  </p>
                )}
              </div>
            )}

            {/* 계산 방식 안내 */}
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 space-y-0.5">
              <p className="font-medium text-foreground/70">📌 가동률 계산 방식</p>
              <p>· 프로세스/포트 중단 → 복구 이벤트 구간을 다운타임으로 집계</p>
              <p>· PC 종료 감지 시 다운타임에 포함 (최대 15분 오차)</p>
              <p>· 90초 미만 단기 중단은 미반영될 수 있음</p>
            </div>

            {/* 이벤트 건수 요약 */}
            {Object.keys(stats.event_counts).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {stats.event_counts.critical > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    위험 {stats.event_counts.critical}건
                  </span>
                )}
                {stats.event_counts.warning > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    경고 {stats.event_counts.warning}건
                  </span>
                )}
                {stats.event_counts.recovery > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    복구 {stats.event_counts.recovery}건
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 이벤트 기록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock size={14} /> 이벤트 기록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">이벤트 없음</p>
          ) : (
            events.map(e => {
              const expanded = expandedEventId === e.id
              return (
                <div
                  key={e.id}
                  className="py-1 border-b last:border-0 cursor-pointer"
                  onClick={() => setExpandedEventId(expanded ? null : e.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${severityColor[e.severity] ?? ''}`}>
                      {severityLabel[e.severity] ?? e.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                        {e.message}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">불러오는 중...</div>}
    </div>
  )
}

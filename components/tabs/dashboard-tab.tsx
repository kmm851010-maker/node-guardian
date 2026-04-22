'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Cpu, BarChart2 } from 'lucide-react'

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

interface NodeStats {
  uptime_percent: number
  daily: { date: string; worst: string }[]
  event_counts: Record<string, number>
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
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    Promise.all([
      fetch(`/api/node-events?pi_uid=${encodeURIComponent(user.username)}&limit=20&offset=0`).then(r => r.json()),
      fetch(`/api/node-status?pi_uid=${encodeURIComponent(user.username)}`).then(r => r.json()),
      fetch(`/api/node-stats?pi_uid=${encodeURIComponent(user.username)}`).then(r => r.json()),
    ]).then(([eventData, statusData, statsData]) => {
      setEvents(eventData.data ?? [])
      setHasMore((eventData.data ?? []).length === 20)
      setOffset(20)
      setStatus(statusData.data ?? null)
      setStats(statsData)
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
                  <span className="text-xs text-muted-foreground">프로세스</span>
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
              <BarChart2 size={14} className="text-violet-500" /> 주간 가동률
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 가동률 바 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">최근 7일</span>
                <span className={`text-sm font-bold ${
                  stats.uptime_percent >= 99 ? 'text-green-600'
                  : stats.uptime_percent >= 95 ? 'text-yellow-600'
                  : 'text-red-600'
                }`}>
                  {stats.uptime_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.uptime_percent >= 99 ? 'bg-green-500'
                    : stats.uptime_percent >= 95 ? 'bg-yellow-500'
                    : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.uptime_percent}%` }}
                />
              </div>
            </div>

            {/* 7일 타임라인 */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">일별 상태</p>
              <div className="grid grid-cols-7 gap-1">
                {stats.daily.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <div className={`w-full h-6 rounded ${dayColor[d.worst] ?? 'bg-gray-200'}`} />
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

'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Cpu, BarChart2, CalendarDays } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'

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

const dayColor: Record<string, string> = {
  healthy:  'bg-green-400',
  warning:  'bg-yellow-400',
  critical: 'bg-red-500',
}

function timeAgo(iso: string, t: (key: string) => string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}${t('dashboard.sec')}`
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('dashboard.min')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('dashboard.hour')}`
  return `${Math.floor(diff / 86400)}${t('dashboard.day')}`
}

function isStale(lastSeen: string) {
  return (Date.now() - new Date(lastSeen).getTime()) > 10 * 60 * 1000
}

export default function DashboardTab({ user }: { user: { uid: string; username: string } | null }) {
  const { t } = useI18n()
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

  const severityLabel: Record<string, string> = {
    info: t('dashboard.info'), warning: t('dashboard.warning'),
    critical: t('dashboard.critical'), recovery: t('dashboard.recovery'),
  }

  const statusBadge = (s: string) => {
    if (s === 'healthy') return <Badge className="bg-green-500 text-white">{t('dashboard.normal')}</Badge>
    if (s === 'warning') return <Badge className="bg-yellow-500 text-white">{t('dashboard.warning')}</Badge>
    if (s === 'critical') return <Badge variant="destructive">{t('dashboard.critical')}</Badge>
    return <Badge variant="secondary">{t('dashboard.unknown')}</Badge>
  }

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayLabel = (isoDate: string) => t(`dashboard.${dayKeys[new Date(isoDate).getDay()]}`)

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
        {t('profile.loginRequired')}
      </div>
    )
  }

  if (loading) return <div className="p-4 text-center text-muted-foreground">{t('profile.loading')}</div>

  return (
    <div className="p-4 space-y-4">
      {/* Node status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu size={14} className="text-violet-500" /> {t('dashboard.myNode')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('dashboard.process')}</span>
                  {statusBadge(status.process_status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.lastSeen')}: {timeAgo(status.last_seen, t)}
                </p>

              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              {t('dashboard.noNodeGuide')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Uptime stats */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 size={14} className="text-violet-500" /> {t('dashboard.uptimeRate')}
              <button
                onClick={() => setCalendarMode(m => !m)}
                className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  calendarMode
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'text-muted-foreground border-muted hover:bg-muted/50'
                }`}
              >
                <CalendarDays size={11} />
                {calendarMode ? t('dashboard.barChart') : t('dashboard.calendar')}
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: t('dashboard.last7d'), value: stats.uptime_7d },
              { label: t('dashboard.last30d'), value: stats.uptime_30d },
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

            {!calendarMode ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('dashboard.last7d')}</p>
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
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> {t('dashboard.normal')}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> {t('dashboard.warning')}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> {t('dashboard.critical')}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const monthly = stats.monthly ?? []
                  if (!monthly.length) return <p className="text-xs text-muted-foreground text-center py-2">{t('dashboard.noData')}</p>
                  const firstDate = new Date(monthly[0].date)
                  const year  = firstDate.getFullYear()
                  const month = firstDate.getMonth()
                  const firstDow = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const dayMap: Record<string, DayData> = {}
                  for (const d of monthly) dayMap[parseInt(d.date.slice(8), 10)] = d

                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">{year}/{month + 1}</p>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {dayKeys.map(d => (
                          <div key={d} className="text-[10px] text-muted-foreground py-0.5">{t(`dashboard.${d}`)}</div>
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
                          <span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> {t('dashboard.normal')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> {t('dashboard.warning')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> {t('dashboard.critical')}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* Node comparison */}
            {uptimeCmp && stats.uptime_7d !== null && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 space-y-1.5">
                <p className="text-xs font-semibold text-violet-700">{t('dashboard.vsAll')}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-violet-600 font-medium">{t('dashboard.myNodeLabel')}</span>
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
                        <span className="text-muted-foreground">{t('dashboard.allAverage')}</span>
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
                    {t('dashboard.nodeRank', { total: uptimeCmp.total, rank: uptimeCmp.my_rank, pct: uptimeCmp.my_top_pct ?? 0 })}
                  </p>
                )}
              </div>
            )}

            {/* Uptime calculation info */}
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 space-y-0.5">
              <p className="font-medium text-foreground/70">📌 {t('dashboard.uptimeCalc')}</p>
              <p>· {t('dashboard.uptimeCalc1')}</p>
              <p>· {t('dashboard.uptimeCalc2')}</p>
              <p>· {t('dashboard.uptimeCalc3')}</p>
            </div>

            {/* Event count summary */}
            {Object.keys(stats.event_counts).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {stats.event_counts.critical > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {t('dashboard.criticalCount', { n: stats.event_counts.critical })}
                  </span>
                )}
                {stats.event_counts.warning > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    {t('dashboard.warningCount', { n: stats.event_counts.warning })}
                  </span>
                )}
                {stats.event_counts.recovery > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {t('dashboard.recoveryCount', { n: stats.event_counts.recovery })}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock size={14} /> {t('dashboard.recentEvents')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noEvents')}</p>
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
                      <p className="text-xs text-muted-foreground">{timeAgo(e.created_at, t)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">{t('profile.loading')}</div>}
    </div>
  )
}

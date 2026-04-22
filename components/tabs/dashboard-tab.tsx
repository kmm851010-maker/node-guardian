'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, Wifi } from 'lucide-react'

interface NodeStatus {
  pi_uid: string
  nickname: string
  process_status: string
  port_status: string
  last_seen: string
  uptime_start: string | null
  node_key: string | null
  last_web_login: string | null
}

interface NodeEvent {
  id: string
  pi_uid: string
  event_type: string
  severity: string
  message: string
  created_at: string
}

const severityColor: Record<string, string> = {
  info:     'bg-blue-100 text-blue-700',
  warning:  'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
  recovery: 'bg-green-100 text-green-700',
}

const statusBadge = (status: string) => {
  if (status === 'healthy') return <Badge className="bg-green-500 text-white">정상</Badge>
  if (status === 'warning') return <Badge className="bg-yellow-500 text-white">경고</Badge>
  if (status === 'critical') return <Badge variant="destructive">중단</Badge>
  return <Badge variant="secondary">알 수 없음</Badge>
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function DashboardTab() {
  const [statuses, setStatuses] = useState<NodeStatus[]>([])
  const [events, setEvents] = useState<NodeEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [statusRes, eventRes] = await Promise.all([
        fetch('/api/node-status'),
        fetch('/api/node-events?limit=20'),
      ])
      const statusData = await statusRes.json()
      const eventData = await eventRes.json()
      setStatuses(statusData.data ?? [])
      setEvents(eventData.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const onlineCount = statuses.filter(s => {
    const diff = (Date.now() - new Date(s.last_seen).getTime()) / 1000
    return diff < 120
  }).length

  const totalCount = statuses.filter(s => {
    if (!s.node_key) return false
    if (!s.last_web_login) return false
    const diff = (Date.now() - new Date(s.last_web_login).getTime()) / 1000
    return diff < 72 * 3600
  }).length

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wifi className="text-green-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">현재 온라인</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="text-violet-500" size={24} />
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">전체 운영자</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 노드 상태 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">노드 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {statuses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              아직 연결된 노드가 없습니다.
            </p>
          )}
          {statuses.filter(s => (Date.now() - new Date(s.last_seen).getTime()) / 1000 < 120).map(s => (
            <div key={s.pi_uid} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-green-500" />
                <span className="text-sm font-medium">{s.nickname || '알 수 없음'}</span>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(s.process_status)}
                <span className="text-xs text-muted-foreground">{timeAgo(s.last_seen)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 최근 이벤트 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock size={14} /> 최근 이벤트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">이벤트 없음</p>
          )}
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-2 py-1 border-b last:border-0">
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${severityColor[e.severity] ?? ''}`}>
                {e.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{e.message}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

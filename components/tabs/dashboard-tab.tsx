'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Cpu, Network } from 'lucide-react'

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

const statusBadge = (status: string) => {
  if (status === 'healthy') return <Badge className="bg-green-500 text-white">정상</Badge>
  if (status === 'warning') return <Badge className="bg-yellow-500 text-white">경고</Badge>
  if (status === 'critical') return <Badge variant="destructive">중단</Badge>
  return <Badge variant="secondary">알 수 없음</Badge>
}

export default function DashboardTab({ user }: { user: { uid: string; username: string } | null }) {
  const [events, setEvents] = useState<NodeEvent[]>([])
  const [status, setStatus] = useState<NodeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    Promise.all([
      fetch(`/api/node-events?pi_uid=${user.uid}&limit=30`).then(r => r.json()),
      fetch(`/api/node-status?pi_uid=${user.uid}`).then(r => r.json()),
    ]).then(([eventData, statusData]) => {
      setEvents(eventData.data ?? [])
      setStatus(statusData.data ?? null)
      setLoading(false)
    })
  }, [user])

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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">포트 전체</span>
                  {statusBadge(status.port_status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  마지막 신호: {timeAgo(status.last_seen)}
                </p>
              </div>

              {/* 포트별 현황 */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Network size={12} /> 포트 현황 (31400~31409)
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 10 }, (_, i) => 31400 + i).map(port => {
                    const isOpen = status.port_detail
                      ? status.port_detail[String(port)] === true
                      : status.port_status === 'healthy'
                    return (
                      <div
                        key={port}
                        className={`text-center rounded py-1 text-xs font-mono ${
                          isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {port}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Node Guardian 앱을 설치하면 상태가 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>

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
            events.map(e => (
              <div key={e.id} className="flex items-start gap-2 py-1 border-b last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${severityColor[e.severity] ?? ''}`}>
                  {severityLabel[e.severity] ?? e.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{e.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

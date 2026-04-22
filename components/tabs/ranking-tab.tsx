'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Wifi, WifiOff, Crown, Star } from 'lucide-react'

interface NodeStatus {
  pi_uid: string
  nickname: string
  process_status: string
  port_status: string
  last_seen: string
  uptime_start: string | null
  node_score: number
}

function uptimeDays(start: string | null): string {
  if (!start) return '-'
  const days = Math.floor((Date.now() - new Date(start).getTime()) / 86400000)
  return `${days}일`
}

const RANK_EMOJI = ['🥇', '🥈', '🥉']

export default function RankingTab() {
  const [statuses, setStatuses] = useState<NodeStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/node-status')
      .then(r => r.json())
      .then(d => { setStatuses(d.data ?? []); setLoading(false) })
  }, [])

  // 노드 점수 → 업타임 순 정렬
  const ranked = [...statuses].sort((a, b) => {
    if ((b.node_score ?? 0) !== (a.node_score ?? 0)) return (b.node_score ?? 0) - (a.node_score ?? 0)
    const aUp = a.uptime_start ? Date.now() - new Date(a.uptime_start).getTime() : 0
    const bUp = b.uptime_start ? Date.now() - new Date(b.uptime_start).getTime() : 0
    return bUp - aUp
  })

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" /> 업타임 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {ranked.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              아직 등록된 노드가 없습니다.
            </p>
          )}
          {ranked.map((s, i) => {
            const isOnline = (Date.now() - new Date(s.last_seen).getTime()) / 1000 < 120
            const isHealthy = s.process_status === 'healthy' && s.port_status === 'healthy'
            return (
              <div key={s.pi_uid} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="text-lg w-8 text-center">
                  {RANK_EMOJI[i] ?? `${i + 1}`}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isOnline
                      ? <Wifi size={12} className="text-green-500" />
                      : <WifiOff size={12} className="text-muted-foreground" />
                    }
                    <span className="text-sm font-medium">{s.nickname}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>업타임: {uptimeDays(s.uptime_start)}</span>
                    {s.node_score > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={10} className="text-yellow-500" />{s.node_score.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={isHealthy ? 'default' : 'secondary'} className={isHealthy ? 'bg-green-500 text-white' : ''}>
                  {isHealthy ? '정상' : '이상'}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

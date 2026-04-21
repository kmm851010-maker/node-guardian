'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, MessageCircle } from 'lucide-react'

interface Post {
  id: string
  nickname: string
  title: string
  content: string
  likes: number
  is_resolved: boolean
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

interface Props {
  user: { uid: string; username: string } | null
}

export default function QnaTab({ user }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')

  useEffect(() => {
    fetch('/api/posts?type=qna')
      .then(r => r.json())
      .then(d => { setPosts(d.data ?? []); setLoading(false) })
  }, [])

  const filtered = posts.filter(p => {
    if (filter === 'open') return !p.is_resolved
    if (filter === 'resolved') return p.is_resolved
    return true
  })

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-3">
      {/* 필터 */}
      <div className="flex gap-2">
        {(['all', 'open', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === f ? 'bg-violet-600 text-white border-violet-600' : 'text-muted-foreground'
            }`}
          >
            {f === 'all' ? '전체' : f === 'open' ? '미해결' : '해결됨'}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <MessageCircle className="mx-auto mb-2 opacity-30" size={32} />
          <p>질문이 없습니다.</p>
        </div>
      )}

      {filtered.map(post => (
        <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {post.is_resolved
                ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                : <Circle size={14} className="text-muted-foreground shrink-0" />
              }
              <span className="text-sm font-semibold flex-1 line-clamp-1">{post.title}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{post.nickname}</span>
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
              {post.is_resolved && (
                <Badge className="ml-auto bg-green-100 text-green-700 text-xs">해결됨</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

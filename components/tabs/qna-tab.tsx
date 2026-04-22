'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

function formatTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) {
    if (diff < 60) return `${diff}초 전`
    const min = Math.floor(diff / 60)
    const sec = diff % 60
    return sec > 0 ? `${min}분 ${sec}초 전` : `${min}분 전`
  }
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

interface Props {
  user: { uid: string; username: string } | null
}

export default function QnaTab({ user }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadPosts = useCallback(async (currentOffset: number) => {
    const res = await fetch(`/api/posts?type=qna&limit=20&offset=${currentOffset}`)
    const data = await res.json()
    return { posts: data.data ?? [], hasMore: data.hasMore ?? false }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadPosts(0).then(({ posts, hasMore }) => {
      setPosts(posts); setHasMore(hasMore); setOffset(20); setLoading(false)
    })
  }, [loadPosts])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        loadPosts(offset).then(({ posts: more, hasMore: moreLeft }) => {
          setPosts(prev => [...prev, ...more])
          setHasMore(moreLeft)
          setOffset(prev => prev + 20)
          setLoadingMore(false)
        })
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, offset, loadPosts])

  const filtered = posts.filter(p => {
    if (filter === 'open') return !p.is_resolved
    if (filter === 'resolved') return p.is_resolved
    return true
  })

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-2">
      <div className="flex gap-2">
        {(['all', 'open', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? 'bg-violet-600 text-white border-violet-600' : 'text-muted-foreground'}`}>
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
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-0.5">
              {post.is_resolved
                ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                : <Circle size={13} className="text-muted-foreground shrink-0" />}
              <span className="text-sm font-semibold flex-1 truncate">{post.title}</span>
              {post.is_resolved && <Badge className="ml-auto bg-green-100 text-green-700 text-xs">해결됨</Badge>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{post.nickname}</span>
              <span className="ml-auto">{formatTime(post.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">불러오는 중...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center text-xs text-muted-foreground py-2">모든 게시글을 불러왔습니다.</div>}
    </div>
  )
}

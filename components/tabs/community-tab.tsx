'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Eye, MessageCircle } from 'lucide-react'

interface Post {
  id: string
  author_uid: string
  nickname: string
  post_type: string
  title: string
  content: string
  likes: number
  views: number
  created_at: string
}

const POST_TYPE_LABEL: Record<string, string> = {
  general: '일반',
  brag:    '자랑',
  issue:   '이슈',
  qna:     'QnA',
}

const POST_TYPE_COLOR: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  brag:    'bg-yellow-100 text-yellow-700',
  issue:   'bg-red-100 text-red-700',
  qna:     'bg-blue-100 text-blue-700',
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

export default function CommunityTab({ user }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => { setPosts(d.data ?? []); setLoading(false) })
  }, [])

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-3">
      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>아직 게시글이 없습니다.</p>
          <p className="mt-1">첫 번째 글을 작성해보세요!</p>
        </div>
      )}
      {posts.map(post => (
        <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${POST_TYPE_COLOR[post.post_type] ?? ''}`}>
                {POST_TYPE_LABEL[post.post_type] ?? post.post_type}
              </span>
              <span className="text-xs text-muted-foreground">{post.nickname}</span>
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
            </div>
            <h3 className="text-sm font-semibold">{post.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
              <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

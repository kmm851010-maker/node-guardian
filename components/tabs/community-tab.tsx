'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Eye, PenSquare, X, ImagePlus, MessageCircle, CornerDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  author_uid: string
  nickname: string
  post_type: string
  title: string
  content: string
  image_url: string | null
  likes: number
  views: number
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  author_uid: string
  nickname: string
  content: string
  parent_id: string | null
  created_at: string
}

const POST_TYPES = [
  { value: 'general', label: '일반',  color: 'bg-gray-100 text-gray-700' },
  { value: 'brag',    label: '자랑',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'issue',   label: '이슈',  color: 'bg-red-100 text-red-700' },
  { value: 'qna',     label: 'QnA',   color: 'bg-blue-100 text-blue-700' },
]

function typeColor(type: string) {
  return POST_TYPES.find(t => t.value === type)?.color ?? 'bg-gray-100 text-gray-700'
}
function typeLabel(type: string) {
  return POST_TYPES.find(t => t.value === type)?.label ?? type
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

export default function CommunityTab({ user }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [showForm, setShowForm] = useState(false)
  const [postType, setPostType] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; nickname: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  const loadPosts = useCallback(async (currentOffset: number) => {
    const res = await fetch(`/api/posts?limit=20&offset=${currentOffset}`)
    const data = await res.json()
    return { posts: data.data ?? [], hasMore: data.hasMore ?? false }
  }, [])

  useEffect(() => {
    loadPosts(0).then(({ posts, hasMore }) => {
      setPosts(posts)
      setHasMore(hasMore)
      setOffset(20)
      setLoading(false)
    })
  }, [loadPosts])

  // 무한스크롤
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

  const toggleExpand = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return }
    setExpandedPost(postId)
    fetch(`/api/posts/${postId}/view`, { method: 'POST' })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: p.views + 1 } : p))
    if (!comments[postId]) {
      const res = await fetch(`/api/posts/${postId}/comments`)
      const data = await res.json()
      setComments(prev => ({ ...prev, [postId]: data.data ?? [] }))
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid }),
    })
    const data = await res.json()
    setLikedPosts(prev => {
      const next = new Set(prev)
      data.liked ? next.add(postId) : next.delete(postId)
      return next
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: p.likes + (data.liked ? 1 : -1) } : p
    ))
  }

  const handleComment = async (postId: string, inputKey: string) => {
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    const content = commentInput[inputKey]?.trim()
    if (!content) return
    setSubmittingComment(true)
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_uid: user.uid,
        nickname: user.username,
        content,
        parent_id: replyTo?.postId === postId ? replyTo.commentId : null,
      }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), data] }))
      setCommentInput(prev => ({ ...prev, [inputKey]: '' }))
      setReplyTo(null)
    }
    setSubmittingComment(false)
  }

  const handleSubmit = async () => {
    if (!user) { toast.error('로그인 후 작성 가능합니다.'); return }
    if (!title.trim() || !content.trim()) { toast.error('제목과 내용을 입력해주세요.'); return }
    setSubmitting(true)
    let image_url: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${user.uid}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('post-images').upload(path, imageFile, { upsert: true })
      if (uploadError) { toast.error('이미지 업로드 실패'); setSubmitting(false); return }
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid, nickname: user.username, post_type: postType, title: title.trim(), content: content.trim(), image_url }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setPosts(prev => [data, ...prev])
      setTitle(''); setContent(''); setPostType('general'); setShowForm(false)
      setImageFile(null); setImagePreview(null)
      toast.success('게시글이 등록됐습니다.')
    } else {
      toast.error('등록 실패. 다시 시도해주세요.')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-2">
      {/* 글쓰기 버튼 */}
      {user && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-violet-300 rounded-xl text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors"
        >
          <PenSquare size={16} /> 글쓰기
        </button>
      )}

      {/* 글쓰기 폼 */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">새 게시글</span>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {POST_TYPES.map(t => (
                <button key={t.value} onClick={() => setPostType(t.value)}
                  className={`text-xs px-3 py-1 rounded-full border-2 transition-colors ${postType === t.value ? 'border-violet-500 ' + t.color : 'border-transparent ' + t.color}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" maxLength={100} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 입력하세요..." rows={4} maxLength={2000} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) { toast.error('5MB 이하 이미지만 첨부 가능합니다.'); return }
                  setImageFile(file); setImagePreview(URL.createObjectURL(file))
                }} />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
                  <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                  <ImagePlus size={14} /> 사진 첨부 (최대 5MB)
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground">취소</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>아직 게시글이 없습니다.</p>
          <p className="mt-1">첫 번째 글을 작성해보세요!</p>
        </div>
      )}

      {posts.map(post => (
        <Card key={post.id} className="overflow-hidden">
          {/* 컴팩트 포스트 헤더 */}
          <CardContent className="p-3 cursor-pointer" onClick={() => toggleExpand(post.id)}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeColor(post.post_type)}`}>{typeLabel(post.post_type)}</span>
              <span className="text-xs font-semibold flex-1 truncate">{post.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{post.nickname}</span>
              <span className="ml-auto">{formatTime(post.created_at)}</span>
              <button className={`flex items-center gap-0.5 ${likedPosts.has(post.id) ? 'text-red-500' : ''}`}
                onClick={e => { e.stopPropagation(); handleLike(post.id) }}>
                <Heart size={11} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} /> {post.likes}
              </button>
              <span className="flex items-center gap-0.5"><Eye size={11} /> {post.views}</span>
              <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {(comments[post.id] ?? []).length}</span>
            </div>
          </CardContent>

          {/* 펼쳐진 본문 + 댓글 */}
          {expandedPost === post.id && (
            <div className="border-t" onClick={e => e.stopPropagation()}>
              {/* 본문 */}
              <div className="px-3 py-2 space-y-2 bg-muted/20">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="post" className="w-full max-h-64 object-cover rounded-lg" />
                )}
              </div>

              {/* 댓글 */}
              <div className="bg-muted/30 px-3 py-2 space-y-2">
                {(comments[post.id] ?? []).map(comment => (
                  !comment.parent_id && (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{comment.nickname}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                          </div>
                          <p className="text-xs">{comment.content}</p>
                        </div>
                        <button onClick={() => setReplyTo(replyTo?.commentId === comment.id ? null : { postId: post.id, commentId: comment.id, nickname: comment.nickname })}
                          className="text-xs text-violet-500 mt-1 whitespace-nowrap">답글</button>
                      </div>
                      {/* 대댓글 */}
                      {(comments[post.id] ?? []).filter(c => c.parent_id === comment.id).map(reply => (
                        <div key={reply.id} className="ml-4 flex items-start gap-1.5">
                          <CornerDownRight size={11} className="text-muted-foreground mt-1.5 shrink-0" />
                          <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{reply.nickname}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                            </div>
                            <p className="text-xs">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      {replyTo?.commentId === comment.id && (
                        <div className="ml-4 flex gap-1.5">
                          <input type="text" value={commentInput[`r-${post.id}`] ?? ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [`r-${post.id}`]: e.target.value }))}
                            placeholder={`@${replyTo.nickname}`}
                            className="flex-1 border rounded-lg px-2.5 py-1 text-xs"
                            onKeyDown={e => { if (e.key === 'Enter') { setCommentInput(prev => ({ ...prev, [post.id]: prev[`r-${post.id}`] ?? '' })); handleComment(post.id, `r-${post.id}`) }}} />
                          <button onClick={() => { setCommentInput(prev => ({ ...prev, [post.id]: prev[`r-${post.id}`] ?? '' })); handleComment(post.id, `r-${post.id}`) }}
                            disabled={submittingComment} className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50">등록</button>
                        </div>
                      )}
                    </div>
                  )
                ))}

                {!replyTo && (
                  <div className="flex gap-1.5">
                    <input type="text" value={commentInput[post.id] ?? ''}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder={user ? '댓글 입력...' : '로그인 후 작성 가능'}
                      disabled={!user}
                      className="flex-1 border rounded-lg px-2.5 py-1 text-xs"
                      onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id, post.id) }} />
                    <button onClick={() => handleComment(post.id, post.id)} disabled={submittingComment || !user}
                      className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50">등록</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* 무한스크롤 sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">불러오는 중...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center text-xs text-muted-foreground py-2">모든 게시글을 불러왔습니다.</div>}
    </div>
  )
}

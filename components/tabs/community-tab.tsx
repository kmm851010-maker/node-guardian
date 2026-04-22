'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [showForm, setShowForm] = useState(false)
  const [postType, setPostType] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 댓글
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; nickname: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => { setPosts(d.data ?? []); setLoading(false) })
  }, [])

  const toggleExpand = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
      return
    }
    setExpandedPost(postId)
    // 조회수 증가
    fetch(`/api/posts/${postId}/view`, { method: 'POST' })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: p.views + 1 } : p))
    // 댓글 로드
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

  const handleComment = async (postId: string) => {
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    const content = commentInput[postId]?.trim()
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
      setCommentInput(prev => ({ ...prev, [postId]: '' }))
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
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, imageFile, { upsert: true })
      if (uploadError) {
        toast.error('이미지 업로드 실패')
        setSubmitting(false)
        return
      }
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
    <div className="p-4 space-y-3">

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
                <button
                  key={t.value}
                  onClick={() => setPostType(t.value)}
                  className={`text-xs px-3 py-1 rounded-full border-2 transition-colors ${
                    postType === t.value ? 'border-violet-500 ' + t.color : 'border-transparent ' + t.color
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={100}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="내용을 입력하세요..."
              rows={4}
              maxLength={2000}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) { toast.error('5MB 이하 이미지만 첨부 가능합니다.'); return }
                  setImageFile(file)
                  setImagePreview(URL.createObjectURL(file))
                }}
              />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-lg" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  <ImagePlus size={14} /> 사진 첨부 (최대 5MB)
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground">취소</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 게시글 목록 */}
      {posts.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>아직 게시글이 없습니다.</p>
          <p className="mt-1">첫 번째 글을 작성해보세요!</p>
        </div>
      )}

      {posts.map(post => (
        <Card key={post.id} className="overflow-hidden">
          {/* 포스트 헤더 - 클릭 시 펼치기 */}
          <CardContent className="p-4 space-y-2 cursor-pointer" onClick={() => toggleExpand(post.id)}>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(post.post_type)}`}>
                {typeLabel(post.post_type)}
              </span>
              <span className="text-xs text-muted-foreground">{post.nickname}</span>
              <span className="text-xs text-muted-foreground ml-auto">{formatTime(post.created_at)}</span>
            </div>
            <h3 className="text-sm font-semibold">{post.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
            {post.image_url && (
              <img src={post.image_url} alt="post" className="w-full h-24 object-cover rounded-lg mt-1" />
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <button
                className={`flex items-center gap-1 transition-colors ${likedPosts.has(post.id) ? 'text-red-500' : ''}`}
                onClick={e => { e.stopPropagation(); handleLike(post.id) }}
              >
                <Heart size={12} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} /> {post.likes}
              </button>
              <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {(comments[post.id] ?? []).length}</span>
            </div>
          </CardContent>

          {/* 댓글 섹션 */}
          {expandedPost === post.id && (
            <div className="border-t bg-muted/30 px-4 py-3 space-y-3" onClick={e => e.stopPropagation()}>
              {/* 댓글 목록 */}
              {(comments[post.id] ?? []).map(comment => (
                <div key={comment.id}>
                  {/* 부모 댓글 */}
                  {!comment.parent_id && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 bg-white rounded-lg px-3 py-2 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{comment.nickname}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                          </div>
                          <p className="text-xs">{comment.content}</p>
                        </div>
                        <button
                          onClick={() => setReplyTo(
                            replyTo?.commentId === comment.id ? null :
                            { postId: post.id, commentId: comment.id, nickname: comment.nickname }
                          )}
                          className="text-xs text-violet-500 mt-1 whitespace-nowrap"
                        >
                          답글
                        </button>
                      </div>
                      {/* 대댓글 */}
                      {(comments[post.id] ?? []).filter(c => c.parent_id === comment.id).map(reply => (
                        <div key={reply.id} className="ml-6 flex items-start gap-2">
                          <CornerDownRight size={12} className="text-muted-foreground mt-2 shrink-0" />
                          <div className="flex-1 bg-white rounded-lg px-3 py-2 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{reply.nickname}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                            </div>
                            <p className="text-xs">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      {/* 답글 입력창 */}
                      {replyTo?.commentId === comment.id && (
                        <div className="ml-6 flex gap-2">
                          <input
                            type="text"
                            value={commentInput[`reply-${post.id}`] ?? ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [`reply-${post.id}`]: e.target.value }))}
                            placeholder={`@${replyTo.nickname} 에게 답글`}
                            className="flex-1 border rounded-lg px-3 py-1.5 text-xs"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setCommentInput(prev => ({ ...prev, [post.id]: prev[`reply-${post.id}`] ?? '' }))
                                handleComment(post.id).then(() => {
                                  setCommentInput(prev => ({ ...prev, [`reply-${post.id}`]: '' }))
                                })
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              setCommentInput(prev => ({ ...prev, [post.id]: prev[`reply-${post.id}`] ?? '' }))
                              handleComment(post.id).then(() => {
                                setCommentInput(prev => ({ ...prev, [`reply-${post.id}`]: '' }))
                              })
                            }}
                            disabled={submittingComment}
                            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50"
                          >
                            등록
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* 댓글 입력 */}
              {!replyTo && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput[post.id] ?? ''}
                    onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder={user ? '댓글을 입력하세요...' : '로그인 후 댓글 작성 가능'}
                    disabled={!user}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs"
                    onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id) }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    disabled={submittingComment || !user}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50"
                  >
                    등록
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, MessageCircle, Heart, CornerDownRight, PenSquare, X, Award, Pencil, Trash2, Crown } from 'lucide-react'
import { toast } from 'sonner'
import UserProfileModal from '@/components/user-profile-modal'

interface Post {
  id: string
  author_uid: string
  nickname: string
  title: string
  content: string
  likes: number
  comments_count: number
  is_resolved: boolean
  best_answer_comment_id: string | null
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  author_uid: string
  nickname: string
  content: string
  parent_id: string | null
  likes: number
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
  isPremium: boolean
}

// 채택 확인 팝업
function BestAnswerPopup({
  nickname,
  onConfirm,
  onClose,
}: {
  nickname: string
  onConfirm: (isResolved: boolean) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-72 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-2">
          <Award size={32} className="text-yellow-500 mx-auto" />
          <p className="font-semibold text-sm">@{nickname}님을 채택하시겠습니까?</p>
          <p className="text-xs text-muted-foreground">채택된 답변자는 랭킹 +5점 보너스를 받습니다.</p>
        </div>
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-center mb-3">질문이 해결되었습니까?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
            >
              ✅ 네
            </button>
            <button
              onClick={() => onConfirm(false)}
              className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              ❌ 아니오
            </button>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default function QnaTab({ user, isPremium }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; nickname: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [profileUid, setProfileUid] = useState<string | null>(null)

  // 채택 팝업
  const [bestAnswerPending, setBestAnswerPending] = useState<{
    postId: string
    commentId: string
    nickname: string
  } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingPost, setDeletingPost] = useState<string | null>(null)

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
    if (user) {
      fetch(`/api/posts/liked?author_uid=${user.uid}`)
        .then(r => r.json())
        .then(d => setLikedPosts(new Set(d.data ?? [])))
      fetch(`/api/comments/liked?author_uid=${user.uid}`)
        .then(r => r.json())
        .then(d => setLikedComments(new Set(d.data ?? [])))
    }
  }, [loadPosts, user])

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
    if (!comments[postId]) {
      const res = await fetch(`/api/posts/${postId}/comments`)
      const data = await res.json()
      setComments(prev => ({ ...prev, [postId]: data.data ?? [] }))
    }
  }

  const startEdit = (post: Post) => {
    setEditingPost(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
    setExpandedPost(post.id)
  }

  const handleEdit = async (postId: string) => {
    if (!user || !editTitle.trim() || !editContent.trim()) return
    setSavingEdit(true)
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid, title: editTitle.trim(), content: editContent.trim() }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, title: data.title, content: data.content } : p))
      setEditingPost(null)
      toast.success('수정됐습니다.')
    } else { toast.error('수정 실패') }
    setSavingEdit(false)
  }

  const handleDelete = async (postId: string) => {
    if (!user) return
    const res = await fetch(`/api/posts/${postId}?author_uid=${user.uid}`, { method: 'DELETE' })
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      if (expandedPost === postId) setExpandedPost(null)
      toast.success('삭제됐습니다.')
    } else { toast.error('삭제 실패') }
    setDeletingPost(null)
  }

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
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

  const handleCommentLike = async (e: React.MouseEvent, commentId: string, postId: string) => {
    e.stopPropagation()
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    const res = await fetch(`/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid }),
    })
    const data = await res.json()
    setLikedComments(prev => {
      const next = new Set(prev)
      data.liked ? next.add(commentId) : next.delete(commentId)
      return next
    })
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map(c =>
        c.id === commentId ? { ...c, likes: c.likes + (data.liked ? 1 : -1) } : c
      ),
    }))
  }

  const handleBestAnswer = (postId: string, commentId: string, nickname: string) => {
    setBestAnswerPending({ postId, commentId, nickname })
  }

  const confirmBestAnswer = async (isResolved: boolean) => {
    if (!bestAnswerPending || !user) return
    const { postId, commentId } = bestAnswerPending
    const res = await fetch(`/api/posts/${postId}/best-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, author_uid: user.uid, is_resolved: isResolved }),
    })
    if (res.ok) {
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, best_answer_comment_id: commentId, is_resolved: isResolved }
          : p
      ))
      toast.success(isResolved ? '채택 완료! 질문이 해결됨으로 표시됩니다.' : '채택 완료!')
    } else {
      const d = await res.json()
      toast.error(d.error ?? '채택 실패')
    }
    setBestAnswerPending(null)
  }

  const handleComment = async (postId: string, inputKey: string) => {
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    const content = commentInput[inputKey]?.trim()
    if (!content) return
    setSubmittingComment(true)
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_uid: user.uid, nickname: user.username, content,
        parent_id: replyTo?.postId === postId ? replyTo.commentId : null,
      }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), data] }))
      setCommentInput(prev => ({ ...prev, [inputKey]: '' }))
      setReplyTo(null)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
    }
    setSubmittingComment(false)
  }

  const handleSubmit = async () => {
    if (!user) { toast.error('로그인 후 작성 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    if (!formTitle.trim() || !formContent.trim()) { toast.error('제목과 내용을 입력해주세요.'); return }
    setSubmitting(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_uid: user.uid, nickname: user.username,
        post_type: 'qna', title: formTitle.trim(), content: formContent.trim(),
      }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setPosts(prev => [data, ...prev])
      setFormTitle(''); setFormContent(''); setShowForm(false)
      toast.success('질문이 등록됐습니다.')
    } else {
      toast.error('등록 실패. 다시 시도해주세요.')
    }
    setSubmitting(false)
  }

  const filtered = posts.filter(p => {
    if (filter === 'open') return !p.is_resolved
    if (filter === 'resolved') return p.is_resolved
    return true
  })

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-2">
      {profileUid && (
        <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      )}
      {bestAnswerPending && (
        <BestAnswerPopup
          nickname={bestAnswerPending.nickname}
          onConfirm={confirmBestAnswer}
          onClose={() => setBestAnswerPending(null)}
        />
      )}

      {/* 삭제 확인 팝업 */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeletingPost(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-72 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-sm text-center">이 질문을 삭제하시겠습니까?</p>
            <p className="text-xs text-muted-foreground text-center">삭제 후 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingPost(null)} className="flex-1 py-2.5 bg-muted rounded-xl text-sm">취소</button>
              <button onClick={() => handleDelete(deletingPost)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold">삭제</button>
            </div>
          </div>
        </div>
      )}

      {user && isPremium && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors">
          <PenSquare size={16} /> 질문 작성
        </button>
      )}
      {user && !isPremium && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-amber-600">
          <Crown size={12} className="text-amber-500" /> 질문 작성은 프리미엄 전용입니다.
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">새 질문</span>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder="질문 제목" maxLength={150} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="relative">
              <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                placeholder="질문 내용을 자세히 입력해주세요..." rows={8} maxLength={10000}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{formContent.length}/10,000</span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground">취소</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {filtered.map(post => {
        const isLiked = likedPosts.has(post.id)
        const isMyPost = user?.uid === post.author_uid
        const isEditing = editingPost === post.id
        return (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-3 cursor-pointer" onClick={() => !isEditing && toggleExpand(post.id)}>
              <div className="flex items-center gap-2 mb-0.5">
                {post.is_resolved
                  ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                  : <Circle size={13} className="text-muted-foreground shrink-0" />}
                <span className="text-sm font-semibold flex-1 truncate">{post.title}</span>
                {post.is_resolved && <Badge className="ml-auto bg-green-100 text-green-700 text-xs shrink-0">해결됨</Badge>}
                {isMyPost && !post.best_answer_comment_id && !isEditing && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => startEdit(post)} className="p-1 text-muted-foreground hover:text-violet-600"><Pencil size={12} /></button>
                    <button onClick={() => setDeletingPost(post.id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  onClick={e => { e.stopPropagation(); setProfileUid(post.author_uid) }}
                  className="hover:text-violet-600 hover:underline transition-colors"
                >
                  {post.nickname}
                </button>
                <span className="ml-auto">{formatTime(post.created_at)}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {post.comments_count ?? 0}</span>
              </div>
            </CardContent>

            <div className="px-3 pb-2 flex items-center border-t border-muted/50 pt-2">
              <button
                onClick={e => handleLike(e, post.id)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition-all active:scale-95 ${
                  isLiked ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-50'
                }`}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
            </div>

            {expandedPost === post.id && (
              <div className="border-t" onClick={e => e.stopPropagation()}>
                {/* 본문 */}
                {isEditing ? (
                  <div className="px-3 py-3 space-y-2 bg-muted/10">
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      maxLength={150} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <div className="relative">
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        maxLength={10000} className="w-full border rounded-lg px-3 py-2 text-sm resize-none min-h-[200px] max-h-[400px] overflow-y-auto" />
                      <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{editContent.length}/10,000</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 text-sm text-muted-foreground">취소</button>
                      <button onClick={() => handleEdit(post.id)} disabled={savingEdit}
                        className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
                        {savingEdit ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-muted/20">
                    <div className="max-h-80 overflow-y-auto overflow-x-hidden">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                    </div>
                  </div>
                )}


                {/* 댓글 */}
                <div className="bg-muted/30 px-3 py-2 space-y-2">
                  {(comments[post.id] ?? []).map(comment => {
                    if (comment.parent_id) return null
                    const isBestAnswer = post.best_answer_comment_id === comment.id
                    return (
                      <div key={comment.id} className="space-y-1">
                        <div className={`flex items-start gap-2 ${isBestAnswer ? 'ring-2 ring-yellow-400 rounded-lg' : ''}`}>
                          <div className={`flex-1 rounded-lg px-2.5 py-1.5 space-y-1 ${isBestAnswer ? 'bg-yellow-50' : 'bg-white'}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setProfileUid(comment.author_uid)}
                                className="text-xs font-medium hover:text-violet-600 hover:underline"
                              >
                                {comment.nickname}
                              </button>
                              {isBestAnswer && (
                                <span className="flex items-center gap-0.5 text-xs bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-full">
                                  <Award size={10} /> 채택
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                              <button
                                onClick={e => handleCommentLike(e, comment.id, post.id)}
                                className={`ml-auto flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 transition-all active:scale-95 ${
                                  likedComments.has(comment.id) ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500'
                                }`}
                              >
                                <Heart size={11} fill={likedComments.has(comment.id) ? 'currentColor' : 'none'} />
                                <span>{comment.likes ?? 0}</span>
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              <p className="text-xs whitespace-pre-wrap leading-relaxed break-words">{comment.content}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            {/* 채택 버튼: 질문자만, 아직 채택 없을 때, 본인 댓글 아닐 때 */}
                            {isMyPost && !post.best_answer_comment_id && comment.author_uid !== user?.uid && (
                              <button
                                onClick={() => handleBestAnswer(post.id, comment.id, comment.nickname)}
                                className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap hover:bg-yellow-100 transition-colors"
                              >
                                채택
                              </button>
                            )}
                            <button
                              onClick={() => setReplyTo(replyTo?.commentId === comment.id ? null : { postId: post.id, commentId: comment.id, nickname: comment.nickname })}
                              className="text-xs text-violet-500 whitespace-nowrap"
                            >
                              답글
                            </button>
                          </div>
                        </div>

                        {/* 대댓글 */}
                        {(comments[post.id] ?? []).filter(c => c.parent_id === comment.id).map(reply => (
                          <div key={reply.id} className="ml-4 flex items-start gap-1.5">
                            <div className="w-3 h-3 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-sm mt-1.5 shrink-0" />
                            <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => setProfileUid(reply.author_uid)}
                                  className="text-xs font-medium hover:text-violet-600 hover:underline"
                                >
                                  {reply.nickname}
                                </button>
                                <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                                <button
                                  onClick={e => handleCommentLike(e, reply.id, post.id)}
                                  className={`ml-auto flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 transition-all active:scale-95 ${
                                    likedComments.has(reply.id) ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500'
                                  }`}
                                >
                                  <Heart size={11} fill={likedComments.has(reply.id) ? 'currentColor' : 'none'} />
                                  <span>{reply.likes ?? 0}</span>
                                </button>
                              </div>
                              <div className="max-h-36 overflow-y-auto">
                                <p className="text-xs whitespace-pre-wrap leading-relaxed break-words">{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {replyTo?.commentId === comment.id && (
                          <div className="ml-4 flex gap-1.5">
                            <textarea
                              value={commentInput[`r-${post.id}`] ?? ''}
                              onChange={e => setCommentInput(prev => ({ ...prev, [`r-${post.id}`]: e.target.value }))}
                              placeholder={`@${replyTo.nickname}에게 답글...`}
                              maxLength={2000}
                              rows={2}
                              className="flex-1 border rounded-lg px-2.5 py-1 text-xs resize-none"
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, `r-${post.id}`) } }}
                            />
                            <button onClick={() => handleComment(post.id, `r-${post.id}`)}
                              disabled={submittingComment} className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50 self-end">등록</button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {!replyTo && (
                    isPremium ? (
                      <div className="flex gap-1.5">
                        <textarea
                          value={commentInput[post.id] ?? ''}
                          onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="답변 입력..."
                          maxLength={2000} rows={2}
                          className="flex-1 border rounded-lg px-2.5 py-1 text-xs resize-none"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, post.id) } }}
                        />
                        <button onClick={() => handleComment(post.id, post.id)} disabled={submittingComment}
                          className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50 self-end">등록</button>
                      </div>
                    ) : user ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <Crown size={12} className="text-amber-500" />
                        <span>답변 작성은 프리미엄 전용입니다.</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">불러오는 중...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center text-xs text-muted-foreground py-2">모든 게시글을 불러왔습니다.</div>}
    </div>
  )
}

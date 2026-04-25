'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Eye, PenSquare, X, ImagePlus, MessageCircle, CornerDownRight, LayoutList, LayoutGrid, Pencil, Trash2, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import UserProfileModal from '@/components/user-profile-modal'

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
  comments_count: number
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

const Spinner = () => (
  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
)

function PremiumRequired({ onGoProfile }: { onGoProfile?: () => void }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
      <Crown size={13} className="text-amber-500" />
      <span>프리미엄 전용 기능입니다.</span>
    </div>
  )
}

interface Props {
  user: { uid: string; username: string } | null
  isPremium: boolean
}

export default function CommunityTab({ user, isPremium }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')

  const [showForm, setShowForm] = useState(false)
  const [postType, setPostType] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 수정
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // 삭제 확인
  const [deletingPost, setDeletingPost] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; nickname: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [piNews, setPiNews] = useState<{ title: string; link: string; date: string }[]>([])

  useEffect(() => {
    fetch('/api/pi-news').then(r => r.json()).then(d => setPiNews(d.items ?? []))
  }, [])
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null)
  const viewedPosts = useRef<Set<string>>(new Set())
  const [profileUid, setProfileUid] = useState<string | null>(null)

  const loadPosts = useCallback(async (currentOffset: number) => {
    const res = await fetch(`/api/posts?limit=20&offset=${currentOffset}`)
    const data = await res.json()
    return { posts: data.data ?? [], hasMore: data.hasMore ?? false }
  }, [])

  useEffect(() => {
    loadPosts(0).then(({ posts, hasMore }) => {
      setPosts(posts); setHasMore(hasMore); setOffset(20); setLoading(false)
    })
    if (user) {
      fetch(`/api/posts/liked?author_uid=${user.uid}`)
        .then(r => r.json()).then(d => setLikedPosts(new Set(d.data ?? [])))
      fetch(`/api/comments/liked?author_uid=${user.uid}`)
        .then(r => r.json()).then(d => setLikedComments(new Set(d.data ?? [])))
    }
  }, [loadPosts, user])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        loadPosts(offset).then(({ posts: more, hasMore: moreLeft }) => {
          setPosts(prev => [...prev, ...more])
          setHasMore(moreLeft); setOffset(prev => prev + 20); setLoadingMore(false)
        })
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, offset, loadPosts])

  const toggleExpand = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return }
    setExpandedPost(postId)
    if (!viewedPosts.current.has(postId)) {
      viewedPosts.current.add(postId)
      fetch(`/api/posts/${postId}/view`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_uid: user?.uid ?? null }),
      })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: p.views + 1 } : p))
    }
    if (!comments[postId]) {
      const res = await fetch(`/api/posts/${postId}/comments`)
      const data = await res.json()
      setComments(prev => ({ ...prev, [postId]: data.data ?? [] }))
    }
  }

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    if (likingPostId) return
    setLikingPostId(postId)
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid }),
    })
    const data = await res.json()
    setLikedPosts(prev => { const next = new Set(prev); data.liked ? next.add(postId) : next.delete(postId); return next })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + (data.liked ? 1 : -1) } : p))
    setLikingPostId(null)
  }

  const handleCommentLike = async (e: React.MouseEvent, commentId: string, postId: string) => {
    e.stopPropagation()
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    if (likingCommentId) return
    setLikingCommentId(commentId)
    const res = await fetch(`/api/comments/${commentId}/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid }),
    })
    const data = await res.json()
    setLikedComments(prev => { const next = new Set(prev); data.liked ? next.add(commentId) : next.delete(commentId); return next })
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map(c => c.id === commentId ? { ...c, likes: c.likes + (data.liked ? 1 : -1) } : c),
    }))
    setLikingCommentId(null)
  }

  const handleComment = async (postId: string, inputKey: string) => {
    if (!user) { toast.error('로그인 후 이용 가능합니다.'); return }
    if (!isPremium) { toast.error('프리미엄 전용 기능입니다.'); return }
    const content = commentInput[inputKey]?.trim()
    if (!content) return
    setSubmittingComment(true)
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_uid: user.uid, nickname: user.username, post_type: postType, title: title.trim(), content: content.trim(), image_url }),
    })
    if (res.ok) {
      const { data } = await res.json()
      setPosts(prev => [data, ...prev])
      setTitle(''); setContent(''); setPostType('general'); setShowForm(false)
      setImageFile(null); setImagePreview(null)
      toast.success('게시글이 등록됐습니다.')
    } else { toast.error('등록 실패. 다시 시도해주세요.') }
    setSubmitting(false)
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
    setIsDeleting(true)
    const res = await fetch(`/api/posts/${postId}?author_uid=${user.uid}`, { method: 'DELETE' })
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      if (expandedPost === postId) setExpandedPost(null)
      toast.success('삭제됐습니다.')
    } else { toast.error('삭제 실패') }
    setIsDeleting(false)
    setDeletingPost(null)
  }

  if (loading) return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>

  return (
    <div className="p-4 space-y-2">
      {profileUid && <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />}

      {/* Pi Core Team 공지 */}
      {piNews.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
          <div className="px-3 py-2 bg-violet-100 flex items-center gap-1.5">
            <span className="text-xs font-bold text-violet-700">📢 Pi Core Team 공지 · 뉴스</span>
            <span className="text-xs text-violet-400 ml-auto">minepi.com/blog</span>
          </div>
          <ul className="divide-y divide-violet-100 max-h-40 overflow-y-auto">
            {piNews.map((item, i) => (
              <li key={i}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 hover:bg-violet-100 transition-colors gap-2"
                >
                  <span className="text-xs text-violet-900 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-violet-400 shrink-0">{item.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 삭제 확인 팝업 */}
      {deletingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !isDeleting && setDeletingPost(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-72 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-sm text-center">이 게시글을 삭제하시겠습니까?</p>
            <p className="text-xs text-muted-foreground text-center">삭제 후 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingPost(null)} disabled={isDeleting}
                className="flex-1 py-2.5 bg-muted rounded-xl text-sm disabled:opacity-40">취소</button>
              <button onClick={() => handleDelete(deletingPost)} disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2">
                {isDeleting ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>삭제 중...</>
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 툴바 */}
      <div className="flex items-center gap-2">
        {/* 뷰 토글 */}
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('list')}
            className={`px-2.5 py-1.5 flex items-center gap-1 text-xs transition-colors ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
            <LayoutList size={14} /> 목록
          </button>
          <button onClick={() => setViewMode('card')}
            className={`px-2.5 py-1.5 flex items-center gap-1 text-xs transition-colors ${viewMode === 'card' ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
            <LayoutGrid size={14} /> 카드
          </button>
        </div>

        {/* 글쓰기 버튼 */}
        {user && isPremium && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 border-2 border-dashed border-violet-300 rounded-lg text-violet-600 text-xs font-medium hover:bg-violet-50 transition-colors ml-auto">
            <PenSquare size={14} /> 글쓰기
          </button>
        )}
        {user && !isPremium && (
          <div className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <Crown size={12} className="text-amber-500" />
            <span>글쓰기는 프리미엄 전용</span>
          </div>
        )}
      </div>

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
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" maxLength={150} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="relative">
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 입력하세요..." rows={8} maxLength={10000} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{content.length}/10,000</span>
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return
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
        </div>
      )}

      {/* 목록 뷰 */}
      {viewMode === 'list' && (
        <div className="border rounded-xl overflow-hidden divide-y">
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground font-medium">
            <span className="w-10 shrink-0">분류</span>
            <span className="flex-1">제목</span>
            <span className="w-14 text-right shrink-0">작성자</span>
            <span className="w-10 text-right shrink-0">날짜</span>
            <span className="w-12 text-right shrink-0 hidden sm:block">조회</span>
          </div>
          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => toggleExpand(post.id)}>
              <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 w-10 text-center ${typeColor(post.post_type)}`}>{typeLabel(post.post_type)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{post.title}
                  {post.comments_count > 0 && <span className="text-violet-500 text-xs ml-1">[{post.comments_count}]</span>}
                </span>
              </div>
              <button onClick={e => { e.stopPropagation(); setProfileUid(post.author_uid) }}
                className="w-14 text-xs text-muted-foreground text-right truncate shrink-0 hover:text-violet-600">{post.nickname}</button>
              <span className="w-10 text-xs text-muted-foreground text-right shrink-0">{formatTime(post.created_at).slice(0,5)}</span>
              <span className="w-12 text-xs text-muted-foreground text-right shrink-0 hidden sm:block flex items-center gap-0.5">
                <Eye size={10} className="inline" /> {post.views}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 카드 뷰 */}
      {viewMode === 'card' && posts.map(post => {
        const isLiked = likedPosts.has(post.id)
        const isMyPost = user?.uid === post.author_uid
        const isEditing = editingPost === post.id
        return (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-3 cursor-pointer" onClick={() => !isEditing && toggleExpand(post.id)}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${typeColor(post.post_type)}`}>{typeLabel(post.post_type)}</span>
                    <span className="text-xs font-semibold flex-1 truncate">{post.title}</span>
                    {isMyPost && !isEditing && (
                      <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => startEdit(post)} className="p-1 text-muted-foreground hover:text-violet-600 transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => setDeletingPost(post.id)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                  {/* 본문 1줄 미리보기 */}
                  <p className="text-xs text-muted-foreground truncate mb-1">{post.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <button onClick={e => { e.stopPropagation(); setProfileUid(post.author_uid) }}
                      className="hover:text-violet-600 hover:underline transition-colors">{post.nickname}</button>
                    <span className="ml-auto">{formatTime(post.created_at)}</span>
                    <span className="flex items-center gap-0.5"><Eye size={11} /> {post.views}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {post.comments_count}</span>
                  </div>
                </div>
                {/* 이미지 썸네일 */}
                {post.image_url && (
                  <img src={post.image_url} alt="thumb"
                    className="w-14 h-14 object-cover rounded-lg shrink-0 border" />
                )}
              </div>
            </CardContent>

            <div className="px-3 pb-2 flex items-center border-t border-muted/50 pt-2">
              <button onClick={e => handleLike(e, post.id)} disabled={!!likingPostId}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition-all active:scale-95 disabled:opacity-60 ${
                  isLiked ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-50'
                }`}>
                {likingPostId === post.id ? <Spinner /> : <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />}
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              {!isPremium && user && (
                <span className="ml-2 text-xs text-amber-500 flex items-center gap-0.5"><Crown size={10} /> 프리미엄</span>
              )}
            </div>

            {expandedPost === post.id && (
              <div className="border-t" onClick={e => e.stopPropagation()}>
                {/* 수정 폼 */}
                {isEditing ? (
                  <div className="px-3 py-3 space-y-2 bg-muted/10">
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      maxLength={150} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <div className="relative">
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        rows={6} maxLength={10000} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
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
                  <div className="px-3 py-2 space-y-2 bg-muted/20">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="post" className="w-full max-h-64 object-cover rounded-lg" />
                    )}
                  </div>
                )}

                {/* 댓글 */}
                {!isEditing && (
                  <div className="bg-muted/30 px-3 py-2 space-y-2">
                    {(comments[post.id] ?? []).map(comment => (
                      !comment.parent_id && (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setProfileUid(comment.author_uid)}
                                  className="text-xs font-medium hover:text-violet-600 hover:underline">{comment.nickname}</button>
                                <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                                <button onClick={e => handleCommentLike(e, comment.id, post.id)} disabled={!!likingCommentId}
                                  className={`ml-auto flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 transition-all active:scale-95 disabled:opacity-60 ${
                                    likedComments.has(comment.id) ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500'
                                  }`}>
                                  {likingCommentId === comment.id ? <Spinner /> : <Heart size={11} fill={likedComments.has(comment.id) ? 'currentColor' : 'none'} />}
                                  <span>{comment.likes ?? 0}</span>
                                </button>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                <p className="text-xs whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                              </div>
                            </div>
                            {isPremium && (
                              <button onClick={() => setReplyTo(replyTo?.commentId === comment.id ? null : { postId: post.id, commentId: comment.id, nickname: comment.nickname })}
                                className="text-xs text-violet-500 mt-1 whitespace-nowrap">답글</button>
                            )}
                          </div>
                          {(comments[post.id] ?? []).filter(c => c.parent_id === comment.id).map(reply => (
                            <div key={reply.id} className="ml-4 flex items-start gap-1.5">
                              <CornerDownRight size={11} className="text-muted-foreground mt-1.5 shrink-0" />
                              <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button onClick={() => setProfileUid(reply.author_uid)}
                                    className="text-xs font-medium hover:text-violet-600 hover:underline">{reply.nickname}</button>
                                  <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                                  <button onClick={e => handleCommentLike(e, reply.id, post.id)}
                                    className={`ml-auto flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 transition-all active:scale-95 ${
                                      likedComments.has(reply.id) ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500'
                                    }`}>
                                    <Heart size={11} fill={likedComments.has(reply.id) ? 'currentColor' : 'none'} />
                                    <span>{reply.likes ?? 0}</span>
                                  </button>
                                </div>
                                <div className="max-h-36 overflow-y-auto">
                                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {replyTo?.commentId === comment.id && isPremium && (
                            <div className="ml-4 flex gap-1.5">
                              <textarea value={commentInput[`r-${post.id}`] ?? ''}
                                onChange={e => setCommentInput(prev => ({ ...prev, [`r-${post.id}`]: e.target.value }))}
                                placeholder={`@${replyTo.nickname}에게 답글...`} maxLength={2000} rows={2}
                                className="flex-1 border rounded-lg px-2.5 py-1 text-xs resize-none"
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, `r-${post.id}`) } }} />
                              <button onClick={() => handleComment(post.id, `r-${post.id}`)} disabled={submittingComment}
                                className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50 self-end flex items-center gap-1">
                                {submittingComment ? <><Spinner />등록 중</> : '등록'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                    {!replyTo && (
                      isPremium ? (
                        <div className="flex gap-1.5">
                          <textarea value={commentInput[post.id] ?? ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="댓글 입력..." maxLength={2000} rows={2}
                            className="flex-1 border rounded-lg px-2.5 py-1 text-xs resize-none"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, post.id) } }} />
                          <button onClick={() => handleComment(post.id, post.id)} disabled={submittingComment}
                            className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs disabled:opacity-50 self-end flex items-center gap-1">
                            {submittingComment ? <><Spinner />등록 중</> : '등록'}
                          </button>
                        </div>
                      ) : (
                        user && <PremiumRequired />
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}

      {/* 목록뷰에서 클릭한 글 상세 */}
      {viewMode === 'list' && expandedPost && (() => {
        const post = posts.find(p => p.id === expandedPost)
        if (!post) return null
        const isLiked = likedPosts.has(post.id)
        const isMyPost = user?.uid === post.author_uid
        const isEditing = editingPost === post.id
        return (
          <Card className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 justify-between mb-2">
                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full mr-2 ${typeColor(post.post_type)}`}>{typeLabel(post.post_type)}</span>
                  <span className="text-sm font-semibold">{post.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isMyPost && (
                    <>
                      <button onClick={() => startEdit(post)} className="p-1 text-muted-foreground hover:text-violet-600"><Pencil size={12} /></button>
                      <button onClick={() => setDeletingPost(post.id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                    </>
                  )}
                  <button onClick={() => setExpandedPost(null)} className="p-1 text-muted-foreground"><X size={14} /></button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <button onClick={() => setProfileUid(post.author_uid)} className="hover:text-violet-600">{post.nickname}</button>
                <span>{formatTime(post.created_at)}</span>
                <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views}</span>
              </div>
            </CardContent>
            <div className="border-t">
              {isEditing ? (
                <div className="px-3 py-3 space-y-2">
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={150} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <div className="relative">
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                      maxLength={10000} className="w-full border rounded-lg px-3 py-2 text-sm resize-none min-h-[200px] max-h-[400px] overflow-y-auto" />
                    <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{editContent.length}/10,000</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 text-sm text-muted-foreground">취소</button>
                    <button onClick={() => handleEdit(post.id)} disabled={savingEdit} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm">저장</button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-muted/20">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                  {post.image_url && <img src={post.image_url} alt="post" className="w-full max-h-64 object-cover rounded-lg mt-2" />}
                </div>
              )}
              <div className="px-3 py-2 border-t flex items-center">
                <button onClick={e => handleLike(e, post.id)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition-all active:scale-95 ${
                    isLiked ? 'text-rose-500 bg-rose-50' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-50'
                  }`}>
                  <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
                  <span className="text-sm font-medium">{post.likes}</span>
                </button>
              </div>
              <div className="bg-muted/30 px-3 py-2 space-y-2">
                {(comments[post.id] ?? []).map(comment => (
                  !comment.parent_id && (
                    <div key={comment.id} className="flex items-start gap-2">
                      <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setProfileUid(comment.author_uid)} className="text-xs font-medium hover:text-violet-600">{comment.nickname}</button>
                          <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  )
                ))}
                {isPremium ? (
                  <div className="flex gap-1.5">
                    <textarea value={commentInput[post.id] ?? ''} onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="댓글 입력..." maxLength={2000} rows={2} className="flex-1 border rounded-lg px-2.5 py-1 text-xs resize-none"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(post.id, post.id) } }} />
                    <button onClick={() => handleComment(post.id, post.id)} disabled={submittingComment}
                      className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs self-end">등록</button>
                  </div>
                ) : user && <PremiumRequired />}
              </div>
            </div>
          </Card>
        )
      })()}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && <div className="text-center text-xs text-muted-foreground py-2">불러오는 중...</div>}
      {!hasMore && posts.length > 0 && <div className="text-center text-xs text-muted-foreground py-2">모든 게시글을 불러왔습니다.</div>}
    </div>
  )
}

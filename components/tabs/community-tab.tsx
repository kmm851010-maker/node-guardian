'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Eye, PenSquare, X, ImagePlus } from 'lucide-react'
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
  const [showForm, setShowForm] = useState(false)
  const [postType, setPostType] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => { setPosts(d.data ?? []); setLoading(false) })
  }, [])

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

            {/* 카테고리 */}
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

            {/* 제목 */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={100}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            {/* 내용 */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="내용을 입력하세요..."
              rows={4}
              maxLength={2000}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />

            {/* 이미지 첨부 */}
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
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-muted-foreground"
              >
                취소
              </button>
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
        <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(post.post_type)}`}>
                {typeLabel(post.post_type)}
              </span>
              <span className="text-xs text-muted-foreground">{post.nickname}</span>
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
            </div>
            <h3 className="text-sm font-semibold">{post.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
            {post.image_url && (
              <img src={post.image_url} alt="post" className="w-full h-24 object-cover rounded-lg mt-1" />
            )}
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

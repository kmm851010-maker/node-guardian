'use client'

import { useEffect, useState } from 'react'
import { X, Heart, FileText, Trophy, Wifi, WifiOff } from 'lucide-react'

interface UserProfile {
  pi_uid: string
  nickname: string | null
  nodeStatus: { process_status: string; port_status: string; last_seen: string } | null
  recentPosts: { id: string; title: string; post_type: string; likes: number; created_at: string }[]
  totalLikes: number
  rankHistory: { week_start: string; rank: number; total_likes: number }[]
}

const POST_TYPE_LABEL: Record<string, string> = {
  general: '일반', brag: '자랑', issue: '이슈', qna: 'QnA',
}
const RANK_EMOJI = ['🥇', '🥈', '🥉']

interface Props {
  uid: string
  onClose: () => void
}

export default function UserProfileModal({ uid, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/users/${uid}`)
      .then(r => r.json())
      .then(d => { setProfile(d); setLoading(false) })
  }, [uid])

  const isOnline = profile?.nodeStatus
    ? (Date.now() - new Date(profile.nodeStatus.last_seen).getTime()) / 1000 < 120
    : false

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg">
              {loading
                ? <div className="w-5 h-5 rounded-full bg-violet-200 animate-pulse" />
                : (profile?.nickname ?? '?')[0]?.toUpperCase()}
            </div>
            <div>
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="font-semibold text-sm">@{profile?.nickname ?? '알 수 없음'}</p>
                  {profile?.nodeStatus && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {isOnline
                        ? <><Wifi size={10} className="text-green-500" /> 온라인</>
                        : <><WifiOff size={10} /> 오프라인</>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-3 h-20 animate-pulse" />
              <div className="bg-muted rounded-xl p-3 h-20 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* 통계 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <Heart size={16} className="text-rose-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-rose-600">{profile?.totalLikes ?? 0}</p>
                <p className="text-xs text-muted-foreground">받은 좋아요</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <FileText size={16} className="text-violet-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-violet-600">{profile?.recentPosts.length ?? 0}+</p>
                <p className="text-xs text-muted-foreground">작성 게시글</p>
              </div>
            </div>

            {/* 랭킹 기록 */}
            {(profile?.rankHistory?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Trophy size={12} className="text-yellow-500" /> 주간 랭킹 기록
                </p>
                <div className="space-y-1.5">
                  {profile!.rankHistory.map(r => (
                    <div key={r.week_start} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-1.5">
                      <span>{RANK_EMOJI[r.rank - 1] ?? `${r.rank}위`} {r.week_start.slice(0, 10)}</span>
                      <span className="text-rose-500 font-medium">❤️ {r.total_likes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 게시글 */}
            {(profile?.recentPosts?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText size={12} /> 최근 게시글
                </p>
                <div className="space-y-1.5">
                  {profile!.recentPosts.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground shrink-0">[{POST_TYPE_LABEL[p.post_type] ?? p.post_type}]</span>
                      <span className="flex-1 truncate">{p.title}</span>
                      <span className="text-rose-500 shrink-0">❤️ {p.likes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

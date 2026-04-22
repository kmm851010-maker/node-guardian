'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Star, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface PremiumStatus {
  isPremium: boolean
  expires_at?: string
}


export default function ProfileTab({ user }: { user: { uid: string; username: string } | null }) {
  const [premium, setPremium] = useState<PremiumStatus>({ isPremium: false })
  const [paying, setPaying] = useState(false)
  const [nodeScore, setNodeScore] = useState<number>(0)
  const [scoreInput, setScoreInput] = useState('')
  const [savingScore, setSavingScore] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`/api/premium?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(setPremium)

    fetch(`/api/node-status?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(d => { if (d.data?.node_score) setNodeScore(d.data.node_score) })
  }, [user])

  const handlePremium = async () => {
    if (!user || !window.Pi) {
      toast.error('Pi Browser에서 로그인 후 이용해주세요.')
      return
    }
    setPaying(true)

    window.Pi.createPayment(
      { amount: 1, memo: 'LinkPi 프리미엄 구독 1개월', metadata: { pi_uid: user.uid } },
      {
        onReadyForServerApproval: async (paymentId) => {
          const res = await fetch('/api/payment/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId }),
          })
          if (!res.ok) {
            const err = await res.json()
            toast.error(`승인 오류: ${err.error}`)
            setPaying(false)
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch('/api/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid, pi_uid: user.uid, nickname: user.username }),
          })
          if (res.ok) {
            setPremium({ isPremium: true })
            toast.success('프리미엄 구독 완료! 🎉')
          } else {
            const err = await res.json()
            toast.error(`완료 오류: ${err.error}`)
          }
          setPaying(false)
        },
        onCancel: () => { setPaying(false); toast.error('결제가 취소됐습니다.') },
        onError: (e) => { console.error(e); setPaying(false); toast.error(`결제 오류: ${JSON.stringify(e)}`) },
      }
    )
  }

  const handleSaveScore = async () => {
    if (!user || !scoreInput) return
    setSavingScore(true)
    await fetch('/api/node-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pi_uid: user.uid, score: parseInt(scoreInput) }),
    })
    setNodeScore(parseInt(scoreInput))
    setScoreInput('')
    setSavingScore(false)
    toast.success('노드 점수가 업데이트됐습니다.')
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Pi 로그인 후 이용 가능합니다.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* 프로필 카드 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">@{user.username}</span>
              {premium.isPremium && (
                <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                  <Crown size={10} className="mr-1" /> 프리미엄
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Pi Node 운영자</p>
          </div>
        </CardContent>
      </Card>

      {/* 노드 점수 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star size={14} className="text-yellow-500" /> 노드 보너스 점수
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-violet-600">{nodeScore.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Pi 앱 → 노드 → 보너스 점수 확인 후 입력</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={scoreInput}
              onChange={e => setScoreInput(e.target.value)}
              placeholder="점수 입력"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleSaveScore}
              disabled={savingScore || !scoreInput}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 프리미엄 구독 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown size={14} className="text-yellow-500" /> 프리미엄 구독
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {premium.isPremium ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-600">✅ 프리미엄 활성화됨</p>
              {premium.expires_at && (
                <p className="text-xs text-muted-foreground">
                  만료: {new Date(premium.expires_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✅ 광고 제거</li>
                <li>✅ 랭킹 상위 노출</li>
                <li>✅ 프리미엄 뱃지</li>
                <li>🔜 Pi 스마트컨트랙트 자동 구독 (예정)</li>
              </ul>
              <button
                onClick={handlePremium}
                disabled={paying}
                className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap size={16} />
                {paying ? '처리 중...' : '1 Pi / 월 구독하기'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

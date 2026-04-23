'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap, ExternalLink, Gift, Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface PremiumStatus {
  isPremium: boolean
  expires_at?: string
}

interface ClaimStatus {
  claimable: boolean
  claimed: boolean
  rank?: number
  total_likes?: number
  week_start?: string
}

export default function ProfileTab({ user }: { user: { uid: string; username: string } | null }) {
  const [premium, setPremium] = useState<PremiumStatus>({ isPremium: false })
  const [paying, setPaying] = useState(false)
  const [nodeKey, setNodeKey] = useState('')
  const [nodeKeyInput, setNodeKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [telegramSubscribed, setTelegramSubscribed] = useState(false)
  const [telegramInput, setTelegramInput] = useState('')
  const [savingTelegram, setSavingTelegram] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`/api/premium?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(setPremium)

    fetch(`/api/node-status?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(d => {
        if (d.data?.node_key) setNodeKey(d.data.node_key)
      })

    fetch(`/api/rankings/claim?pi_uid=${user.uid}`)
      .then(r => r.json())
      .then(d => setClaimStatus(d))

    fetch(`/api/telegram-subscribe?pi_uid=${encodeURIComponent(user.username)}`)
      .then(r => r.json())
      .then(d => setTelegramSubscribed(d.subscribed ?? false))
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
          try {
            const res = await fetch('https://linkpi.io/api/payment/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId }),
            })
            const text = await res.text()
            if (!res.ok) {
              toast.error(`승인 오류 ${res.status}: ${text}`)
              setPaying(false)
            }
          } catch (e) {
            toast.error(`승인 fetch 오류: ${String(e)}`)
            setPaying(false)
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch('https://linkpi.io/api/payment/complete', {
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

  const handleClaim = async () => {
    if (!user) return
    setClaiming(true)
    const res = await fetch('/api/rankings/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pi_uid: user.uid }),
    })
    const data = await res.json()
    if (res.ok) {
      setClaimStatus(prev => prev ? { ...prev, claimable: false, claimed: true } : prev)
      toast.success(`🎉 ${data.rank}위 상금 수령 신청 완료! 72시간 내 10 Pi가 지급됩니다.`)
    } else {
      toast.error(data.error ?? '수령 실패')
    }
    setClaiming(false)
  }

  const handleTelegramSave = async () => {
    if (!user || !telegramInput.trim()) return
    setSavingTelegram(true)
    const res = await fetch('/api/telegram-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pi_uid: user.username, chat_id: telegramInput.trim() }),
    })
    if (res.ok) {
      setTelegramSubscribed(true)
      setTelegramInput('')
      toast.success('텔레그램 알림이 연결됐습니다. 텔레그램에서 확인 메시지를 받으셨나요?')
    } else {
      toast.error('연결 실패. Chat ID를 다시 확인해주세요.')
    }
    setSavingTelegram(false)
  }

  const handleTelegramDisconnect = async () => {
    if (!user) return
    await fetch(`/api/telegram-subscribe?pi_uid=${encodeURIComponent(user.username)}`, { method: 'DELETE' })
    setTelegramSubscribed(false)
    toast.success('텔레그램 알림이 해제됐습니다.')
  }

  const handleSaveKey = async () => {
    if (!user || !nodeKeyInput) return
    setSavingKey(true)
    const res = await fetch('/api/node-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pi_uid: user.uid, node_key: nodeKeyInput.trim() }),
    })
    if (res.ok) {
      setNodeKey(nodeKeyInput.trim())
      setNodeKeyInput('')
      toast.success('노드 고유번호가 저장됐습니다.')
    } else {
      toast.error('저장 실패')
    }
    setSavingKey(false)
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

      {/* 노드 고유번호 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink size={14} className="text-violet-500" /> 노드 고유번호 (블록체인 랭킹)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nodeKey && (
            <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground truncate flex-1">{nodeKey}</span>
              <a
                href="https://blockexplorer.minepi.com/mainnet/nodes"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(nodeKey)
                  } catch {
                    const el = document.createElement('textarea')
                    el.value = nodeKey
                    document.body.appendChild(el)
                    el.select()
                    document.execCommand('copy')
                    document.body.removeChild(el)
                  }
                  toast.success('고유번호가 복사됐습니다. 검색창에 붙여넣기 하세요.')
                }}
                className="ml-2 flex items-center gap-1 text-xs text-violet-600 font-medium whitespace-nowrap"
              >
                랭킹 확인 <ExternalLink size={11} />
              </a>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Pi 앱 → 노드 → 고유번호 확인 후 입력</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nodeKeyInput}
              onChange={e => setNodeKeyInput(e.target.value)}
              placeholder="노드 고유번호 입력"
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleSaveKey}
              disabled={savingKey || !nodeKeyInput}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 텔레그램 알림 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send size={14} className="text-violet-500" /> 텔레그램 알림
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {telegramSubscribed ? (
            <div className="space-y-2">
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Send size={12} /> 텔레그램 알림 활성화됨
              </p>
              <button
                onClick={handleTelegramDisconnect}
                className="text-xs text-red-500 underline"
              >
                연결 해제
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Pi Browser에서는 웹 푸시가 지원되지 않습니다. 텔레그램으로 노드 이상 알림을 받으세요.
              </p>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">채팅 ID 확인 방법</p>
                <p>① 텔레그램에서 <span className="font-mono">@serge_node_guardian_bot</span> 검색</p>
                <p>② 채팅창에서 <span className="font-mono">/start</span> 입력</p>
                <p>③ 봇이 답장한 숫자(Chat ID)를 아래에 입력</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramInput}
                  onChange={e => setTelegramInput(e.target.value)}
                  placeholder="예: 123456789"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={handleTelegramSave}
                  disabled={savingTelegram || !telegramInput.trim()}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {savingTelegram ? '저장 중...' : '연결'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 주간 랭킹 상금 수령 */}
      {claimStatus && (claimStatus.claimable || claimStatus.claimed) && (
        <Card className={claimStatus.claimable ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift size={14} className="text-yellow-500" /> 주간 랭킹 상금
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-semibold">
                {claimStatus.rank}위 선정 🎉
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {claimStatus.week_start} 주 · ❤️ {claimStatus.total_likes}개 받음
              </p>
            </div>
            {claimStatus.claimable ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Gift size={16} />
                {claiming ? '처리 중...' : '10 Pi 상금 수령하기'}
              </button>
            ) : (
              <p className="text-sm text-green-600 font-medium">✅ 상금 수령 신청 완료 (72시간 내 지급)</p>
            )}
          </CardContent>
        </Card>
      )}

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
                <li>✅ 프리미엄 뱃지</li>
                <li>✅ 노드 운영자 커뮤니티 참여 (노하우 공유 · 질문 해결)</li>
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

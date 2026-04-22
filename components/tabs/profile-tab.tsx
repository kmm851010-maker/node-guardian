'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface PremiumStatus {
  isPremium: boolean
  expires_at?: string
}


export default function ProfileTab({ user }: { user: { uid: string; username: string } | null }) {
  const [premium, setPremium] = useState<PremiumStatus>({ isPremium: false })
  const [paying, setPaying] = useState(false)
  const [nodeKey, setNodeKey] = useState('')
  const [nodeKeyInput, setNodeKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)

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
            const res = await fetch('https://pilink.vercel.app/api/payment/approve', {
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
          const res = await fetch('https://pilink.vercel.app/api/payment/complete', {
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

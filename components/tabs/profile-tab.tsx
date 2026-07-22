'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap, ExternalLink, Gift, Send, Star, Pencil, Camera, Check, X, Bell, MessageSquare, CornerDownRight, Dice5 } from 'lucide-react'
import DiceGame from '@/components/dice-game'
import { useAuth } from '@/contexts/auth-context'
import { useI18n } from '@/contexts/i18n-context'
import { toast } from 'sonner'

const BADGE_COLORS: Record<string, string> = {
  crown: 'text-yellow-700', flame: 'text-orange-600', diamond: 'text-purple-700',
  scholar: 'text-blue-600', trophy: 'text-rose-600', shield: 'text-emerald-600',
  zap_node: 'text-amber-600', gem: 'text-cyan-600',
}

const SVG_BADGES = new Set(['shield', 'zap_node', 'gem'])
function badgeSrc(b: string) {
  return `/badges/badge-${b}.${SVG_BADGES.has(b) ? 'svg' : 'png'}`
}

interface PremiumStatus {
  isPremium: boolean
  expires_at?: string
  canceled?: boolean
}

interface ClaimStatus {
  claimable: boolean
  claimed: boolean
  rank?: number
  total_likes?: number
  best_answer_count?: number
  comment_count?: number
  view_score?: number
  week_start?: string
}

function getLevel(xp: number): number {
  if (xp >= 15650) return 100
  if (xp >= 3650)  return 40 + Math.floor((xp - 3650) / 200)
  if (xp >= 2150)  return 30 + Math.floor((xp - 2150) / 150)
  if (xp >= 1150)  return 20 + Math.floor((xp - 1150) / 100)
  if (xp >= 450)   return 10 + Math.floor((xp - 450)  / 70)
  return Math.floor(xp / 50) + 1
}

function getNextLevelThreshold(level: number): number | null {
  if (level >= 100) return null
  if (level < 10)  return level * 50
  if (level < 20)  return 450  + (level - 9)  * 70
  if (level < 30)  return 1150 + (level - 19) * 100
  if (level < 40)  return 2150 + (level - 29) * 150
  return 3650 + (level - 39) * 200
}

interface NotifItem {
  type: 'new_comment' | 'new_reply'
  post_id: string
  post_title: string
  post_type: string
  comment_id: string
  content: string
  nickname: string
  display_name: string | null
  created_at: string
}

export default function ProfileTab({ user, onPremiumChange, notifSince, onNavigateToPost }: { user: { uid: string; username: string } | null; onPremiumChange?: (v: boolean) => void; notifSince?: string; onNavigateToPost?: (postId: string, postType: string) => void }) {
  const { t } = useI18n()
  const [premium, setPremium] = useState<PremiumStatus>({ isPremium: false })
  const [paying, setPaying] = useState(false)
  const didReauth = useRef(false)
  const [canceling, setCanceling] = useState(false)
  const [nodeKey, setNodeKey] = useState('')
  const [nodeKeyInput, setNodeKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [telegramSubscribed, setTelegramSubscribed] = useState(false)
  const [telegramInput, setTelegramInput] = useState('')
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [attendance, setAttendance] = useState<{ checked_today: boolean; week_xp: number; total_xp: number } | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showAdModal, setShowAdModal] = useState(false)
  const [adXpEarned, setAdXpEarned] = useState(0)
  const [showDice, setShowDice] = useState(false)
  const [diceAvailable, setDiceAvailable] = useState(0)
  const [streak, setStreak] = useState(0)
  const [myBadges, setMyBadges] = useState<string[]>([])
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [notifOffset, setNotifOffset] = useState(0)
  const [notifHasMore, setNotifHasMore] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const notifSentinelRef = useRef<HTMLDivElement>(null)
  const profileKey = `pilink_profile_${user?.uid ?? ''}`
  const [profileData, setProfileData] = useState<{ display_name?: string; avatar_url?: string } | null>(() => {
    if (typeof window === 'undefined' || !user?.uid) return null
    const cached = localStorage.getItem(`pilink_profile_${user.uid}`)
    return cached ? JSON.parse(cached) : null
  })
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/badges')
      .then(r => r.json())
      .then(d => setMyBadges((d.badges ?? {})[user.uid] ?? []))
  }, [user])

  useEffect(() => {
    if (!user) return
    fetch(`/api/premium?pi_uid=${user.uid}`).then(r => r.json()).then(setPremium)
    fetch(`/api/node-status?pi_uid=${user.uid}`).then(r => r.json()).then(d => { if (d.data?.node_key) setNodeKey(d.data.node_key) })
    fetch(`/api/rankings/claim?pi_uid=${user.uid}`).then(r => r.json()).then(d => setClaimStatus(d))
    fetch(`/api/telegram-subscribe?pi_uid=${encodeURIComponent(user.username)}`).then(r => r.json()).then(d => setTelegramSubscribed(d.subscribed ?? false))
    fetch(`/api/attendance?pi_uid=${user.uid}`).then(r => r.json()).then(d => { setAttendance(d); if (d.streak) setStreak(d.streak) })
    fetch(`/api/attendance/dice?pi_uid=${user.uid}`).then(r => r.json()).then(d => { setDiceAvailable(d.diceAvailable ?? 0); if (d.streak) setStreak(d.streak) })
    fetch(`/api/notifications?pi_uid=${encodeURIComponent(user.uid)}&username=${encodeURIComponent(user.username)}&since=1970-01-01T00%3A00%3A00.000Z&limit=10&offset=0`)
      .then(r => r.json()).then(d => { setNotifications(d.items ?? []); setNotifHasMore(d.hasMore ?? false); setNotifOffset(10) })
  }, [user])

  useEffect(() => {
    if (!notifSentinelRef.current || !user) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && notifHasMore && !notifLoading) {
        setNotifLoading(true)
        fetch(`/api/notifications?pi_uid=${encodeURIComponent(user.uid)}&username=${encodeURIComponent(user.username)}&since=1970-01-01T00%3A00%3A00.000Z&limit=10&offset=${notifOffset}`)
          .then(r => r.json())
          .then(d => { setNotifications(prev => [...prev, ...(d.items ?? [])]); setNotifHasMore(d.hasMore ?? false); setNotifOffset(prev => prev + 10); setNotifLoading(false) })
      }
    }, { threshold: 0.1 })
    observer.observe(notifSentinelRef.current)
    return () => observer.disconnect()
  }, [notifHasMore, notifLoading, notifOffset, user])

  useEffect(() => {
    if (!user) return
    fetch(`/api/profile?pi_uid=${user.uid}&username=${encodeURIComponent(user.username)}`)
      .then(r => r.json())
      .then(data => {
        if (data.display_name || data.avatar_url) { localStorage.setItem(profileKey, JSON.stringify(data)); setProfileData(data) }
        else { localStorage.removeItem(profileKey); setProfileData(null) }
      })
  }, [user])

  const handleCancelPremium = async () => {
    if (!user) return
    if (!confirm(t('profile.cancelConfirm'))) return
    setCanceling(true)
    const res = await fetch('/api/premium', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid }) })
    if (res.ok) { setPremium(prev => ({ ...prev, canceled: true })); toast.success(t('profile.cancelDone')) }
    else { toast.error(t('profile.cancelFailed')) }
    setCanceling(false)
  }

  const handlePremium = async () => {
    if (!user || !window.Pi) { toast.error(t('profile.loginRequired')); return }
    setPaying(true)
    if (!didReauth.current) {
      try {
        await window.Pi.authenticate(['username', 'payments'], async (payment: any) => {
          if (payment.transaction?.txid) {
            await fetch('/api/payment/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction.txid, pi_uid: user.uid, nickname: user.username }) }).catch(() => {})
          }
        })
        didReauth.current = true
      } catch { setPaying(false); return }
    }
    await window.Pi.init({ version: '2.0', sandbox: true }).catch(() => {})
    window.Pi.createPayment(
      { amount: 1, memo: 'LinkPi Premium 1 month', metadata: { pi_uid: user.uid } },
      {
        onReadyForServerApproval: async (paymentId) => {
          try {
            const res = await fetch('/api/payment/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) })
            if (!res.ok) { const text = await res.text(); toast.error(`Error ${res.status}: ${text}`); setPaying(false) }
          } catch (e) { toast.error(String(e)); setPaying(false) }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const res = await fetch('/api/payment/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, txid, pi_uid: user.uid, nickname: user.username }) })
            if (res.ok) { const updated = await fetch(`/api/premium?pi_uid=${user.uid}`).then(r => r.json()); setPremium(updated); onPremiumChange?.(updated.isPremium); toast.success(t('profile.premiumComplete')) }
            else { const data = await res.json(); toast.error(data.error) }
          } catch (e) { toast.error(String(e)) }
          setPaying(false)
        },
        onCancel: () => { setPaying(false); toast.error(t('profile.paymentCanceled')) },
        onError: (e) => { setPaying(false); toast.error(JSON.stringify(e)) },
      }
    )
  }

  const handleClaim = async () => {
    if (!user) return
    setClaiming(true)
    const res = await fetch('/api/rankings/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid }) })
    const data = await res.json()
    if (res.ok) { setClaimStatus(prev => prev ? { ...prev, claimable: false, claimed: true } : prev); const updated = await fetch(`/api/premium?pi_uid=${user.uid}`).then(r => r.json()); setPremium(updated); onPremiumChange?.(updated.isPremium); toast.success(t('profile.premiumComplete')) }
    else { toast.error(data.error ?? t('profile.saveFailed')) }
    setClaiming(false)
  }

  const handleTelegramSave = async () => {
    if (!user || !telegramInput.trim()) return
    setSavingTelegram(true)
    const res = await fetch('/api/telegram-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.username, chat_id: telegramInput.trim() }) })
    if (res.ok) { setTelegramSubscribed(true); setTelegramInput(''); toast.success(t('profile.telegramConnected')) }
    else { toast.error(t('profile.telegramFailed')) }
    setSavingTelegram(false)
  }

  const handleTelegramDisconnect = async () => {
    if (!user) return
    await fetch(`/api/telegram-subscribe?pi_uid=${encodeURIComponent(user.username)}`, { method: 'DELETE' })
    setTelegramSubscribed(false)
    toast.success(t('profile.telegramDisconnected'))
  }

  const handleAttendance = async () => {
    if (!user) return
    setCheckingIn(true)
    const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid }) })
    const data = await res.json()
    if (res.ok) {
      setAttendance(prev => prev ? { ...prev, checked_today: true, week_xp: prev.week_xp + data.xp_earned, total_xp: prev.total_xp + data.xp_earned } : null)
      if (data.streak) setStreak(data.streak)
      setAdXpEarned(data.xp_earned)
      fetch(`/api/attendance/dice?pi_uid=${user.uid}`).then(r => r.json()).then(d => setDiceAvailable(d.diceAvailable ?? 0))
      setShowAdModal(true)
    } else {
      toast.error(data.error === 'already_checked' ? t('profile.alreadyChecked') : t('profile.checkFailed'))
    }
    setCheckingIn(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error(t('profile.avatarTooLarge')); return }
    setUploadingAvatar(true)
    try {
      const fd = new FormData(); fd.append('pi_uid', user.uid); fd.append('nickname', user.username); fd.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { const next = { ...(profileData ?? {}), avatar_url: data.avatar_url }; setProfileData(next); localStorage.setItem('pilink_profile', JSON.stringify(next)); toast.success(t('profile.avatarUpdated')) }
      else { alert(data.error) }
    } catch (e) { alert(String(e)) }
    setUploadingAvatar(false)
    e.target.value = ''
  }

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid, nickname: user.username, display_name: nameInput.trim() }) })
      const data = await res.json()
      if (res.ok) { const next = { ...(profileData ?? {}), display_name: data.display_name }; setProfileData(next); localStorage.setItem(profileKey, JSON.stringify(next)); setEditingName(false); toast.success(t('profile.nicknameSaved')) }
      else if (res.status === 409) { alert(data.error ?? t('profile.nicknameExists')) }
      else { alert(data.error) }
    } catch (e) { alert(String(e)) }
    setSavingName(false)
  }

  const handleSaveKey = async () => {
    if (!user || !nodeKeyInput) return
    setSavingKey(true)
    const res = await fetch('/api/node-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid, node_key: nodeKeyInput.trim() }) })
    if (res.ok) { setNodeKey(nodeKeyInput.trim()); setNodeKeyInput(''); toast.success(t('profile.keySaved')) }
    else { toast.error(t('profile.saveFailed')) }
    setSavingKey(false)
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground text-sm">{t('profile.loginRequired')}</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* Profile card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl overflow-hidden cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              {profileData?.avatar_url ? <img src={profileData.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 bg-violet-600 text-white rounded-full p-1 shadow" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? <span className="w-3 h-3 block border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={10} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1 mb-1">
                <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} maxLength={20} className="border rounded px-2 py-0.5 text-sm flex-1 min-w-0" onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }} />
                <button onClick={handleSaveName} disabled={savingName} className="text-violet-600 disabled:opacity-50"><Check size={15} /></button>
                <button onClick={() => setEditingName(false)} className="text-muted-foreground"><X size={15} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold truncate">{profileData?.display_name ?? `@${user.username}`}</span>
                {premium.isPremium && <Badge className="bg-yellow-400 text-yellow-900 text-xs shrink-0"><Crown size={10} className="mr-1" /> {t('profile.premium')}</Badge>}
                <button onClick={() => { setNameInput(profileData?.display_name ?? user.username); setEditingName(true) }} className="text-muted-foreground hover:text-violet-600 shrink-0"><Pencil size={12} /></button>
              </div>
            )}
            {profileData?.display_name && <p className="text-xs text-muted-foreground">@{user.username}</p>}
            {attendance ? (() => {
              const lv = getLevel(attendance.total_xp)
              const nextThreshold = getNextLevelThreshold(lv)
              const prevThreshold = lv > 1 ? getNextLevelThreshold(lv - 1) ?? 0 : 0
              const xpInLevel = attendance.total_xp - prevThreshold
              const xpNeeded = nextThreshold !== null ? nextThreshold - prevThreshold : 0
              const pct = nextThreshold !== null ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100
              return (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-violet-700">Lv.{lv}</p>
                  {nextThreshold !== null ? (
                    <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div className="bg-violet-500 h-4 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white drop-shadow">{xpInLevel} / {xpNeeded}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-violet-600 font-medium">{t('profile.maxLevel')}</p>
                  )}
                </div>
              )
            })() : <p className="text-xs text-muted-foreground">{t('profile.piNodeOperator')}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {myBadges.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">{t('profile.badges')}</p>
            <div className="flex flex-wrap gap-4">
              {myBadges.map(b => (
                <div key={b} className="flex flex-col items-center gap-1">
                  <img src={badgeSrc(b)} alt={b} className="w-12 h-12" />
                  <span className={`text-xs font-medium text-center ${BADGE_COLORS[b] ?? 'text-muted-foreground'}`}>{t(`badge.${b}`)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Bell size={14} className="text-violet-500" /> {t('profile.notifications')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t('profile.noNotifications')}</p>
          ) : (
            <div className="divide-y">
              {notifications.map(item => (
                <div key={item.comment_id} className="flex gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/40 active:bg-muted transition-colors" onClick={() => onNavigateToPost?.(item.post_id, item.post_type)}>
                  <span className="shrink-0 mt-0.5 text-violet-400">{item.type === 'new_reply' ? <CornerDownRight size={13} /> : <MessageSquare size={13} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium">{item.display_name ?? item.nickname}</span>
                      <span className="text-xs text-muted-foreground">{item.type === 'new_reply' ? t('profile.reply') : t('profile.comment')}</span>
                      <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">{item.post_type === 'qna' ? 'Q&A' : t('app.tabs.community')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">📄 {item.post_title}</p>
                    <p className="text-xs text-foreground/80 truncate mt-0.5">💬 {item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={notifSentinelRef} className="h-2" />
          {notifLoading && <p className="text-xs text-muted-foreground text-center py-2">{t('profile.loading')}</p>}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Star size={14} className="text-yellow-500" /> {t('profile.attendance')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendance && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('profile.weekXp')}</span>
                <span className="font-semibold text-violet-600">+{attendance.week_xp} XP</span>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                  <span className="text-lg">🔥</span>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-orange-600">{t('profile.streakDays', { days: streak })}</span>
                    {streak % 7 !== 0 && <p className="text-xs text-orange-400">{t('profile.nextDice', { days: 7 - (streak % 7) })}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={handleAttendance} disabled={checkingIn || !!attendance?.checked_today} className="w-full py-2.5 bg-violet-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
            {attendance?.checked_today ? `✅ ${t('profile.checkedToday')}` : checkingIn ? t('profile.checking') : `📅 ${t('profile.checkIn')}`}
          </button>
          {diceAvailable > 0 && (
            <button onClick={() => setShowDice(true)} className="w-full py-2.5 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 text-sm animate-pulse">
              <Dice5 size={16} /> {t('profile.rollDice', { count: diceAvailable })}
            </button>
          )}
          <p className="text-xs text-muted-foreground text-center">{t('profile.streakDiceInfo')}</p>
        </CardContent>
      </Card>

      {/* Node Key */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ExternalLink size={14} className="text-violet-500" /> {t('profile.nodeKey')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nodeKey && (
            <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-muted-foreground truncate flex-1">{nodeKey}</span>
              <a href="https://blockexplorer.minepi.com/mainnet/nodes" target="_blank" rel="noopener noreferrer"
                onClick={() => { try { navigator.clipboard.writeText(nodeKey) } catch { const el = document.createElement('textarea'); el.value = nodeKey; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }; toast.success(t('profile.keySaved')) }}
                className="ml-2 flex items-center gap-1 text-xs text-violet-600 font-medium whitespace-nowrap"
              >{t('profile.checkRanking')} <ExternalLink size={11} /></a>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('profile.nodeKeyGuide')}</p>
          <div className="flex gap-2">
            <input type="text" value={nodeKeyInput} onChange={e => setNodeKeyInput(e.target.value)} placeholder={t('profile.nodeKeyPlaceholder')} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" />
            <button onClick={handleSaveKey} disabled={savingKey || !nodeKeyInput} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">{t('profile.save')}</button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Send size={14} className="text-violet-500" /> {t('profile.telegram')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {telegramSubscribed ? (
            <div className="space-y-2">
              <p className="text-xs text-green-600 flex items-center gap-1"><Send size={12} /> {t('profile.telegramActive')}</p>
              <button onClick={handleTelegramDisconnect} className="text-xs text-red-500 underline">{t('profile.telegramDisconnect')}</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('profile.telegramGuide')}</p>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">{t('profile.telegramHow')}</p>
                <p>① {t('profile.telegramStep1')}</p>
                <p>② {t('profile.telegramStep2')}</p>
                <p>③ {t('profile.telegramStep3')}</p>
              </div>
              <div className="flex gap-2">
                <input type="text" value={telegramInput} onChange={e => setTelegramInput(e.target.value)} placeholder={t('profile.telegramPlaceholder')} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" />
                <button onClick={handleTelegramSave} disabled={savingTelegram || !telegramInput.trim()} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {savingTelegram ? t('profile.telegramSaving') : t('profile.telegramConnect')}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly reward claim */}
      {claimStatus && (claimStatus.claimable || claimStatus.claimed) && (() => {
        const nowKST = new Date(Date.now() + 9 * 3600000)
        const day = nowKST.getUTCDay()
        const nextSun = new Date(nowKST.getTime() + (7 - day) * 86400000)
        const deadline = `${nextSun.getUTCMonth() + 1}/${nextSun.getUTCDate()} 00:00 (KST)`
        return (
        <Card className={claimStatus.claimable ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Gift size={14} className="text-yellow-500" /> {t('profile.weeklyReward')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-semibold">{t('profile.weeklyRankAchieved', { rank: claimStatus.rank ?? 0 })} 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">
                {claimStatus.week_start}
                {claimStatus.total_likes ? ` · ❤️ ${claimStatus.total_likes}` : ''}
                {claimStatus.best_answer_count ? ` · 🎓 ${claimStatus.best_answer_count}` : ''}
                {claimStatus.comment_count ? ` · 💬 ${claimStatus.comment_count}` : ''}
                {claimStatus.view_score ? ` · 👁 ${claimStatus.view_score * 10}` : ''}
              </p>
            </div>
            {claimStatus.claimable ? (
              <>
                <button onClick={handleClaim} disabled={claiming} className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  <Gift size={16} /> {claiming ? t('profile.checking') : t('profile.claimPremium')}
                </button>
                <p className="text-xs text-orange-500 text-center">⏰ {t('profile.claimDeadline', { deadline })}</p>
              </>
            ) : (
              <p className="text-sm text-green-600 font-medium">✅ {t('profile.claimDone')}</p>
            )}
          </CardContent>
        </Card>
        )
      })()}

      {/* Premium */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Crown size={14} className="text-yellow-500" /> {t('profile.premiumSubscription')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {premium.isPremium ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">✅ {t('profile.premiumActive')}</p>
              {premium.expires_at && (() => {
                const days = Math.ceil((new Date(premium.expires_at).getTime() - Date.now()) / 86400000)
                return (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.premiumExpires', { date: new Date(premium.expires_at).toLocaleDateString() })}
                      {days > 0 && <span className="ml-1 text-green-600 font-medium">({t('profile.premiumDaysLeft', { days })})</span>}
                    </p>
                    {days <= 7 && (
                      <button onClick={handlePremium} disabled={paying} className="w-full py-2.5 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                        {paying ? t('profile.checking') : `🔁 ${t('profile.premiumExtend')}`}
                      </button>
                    )}
                  </>
                )
              })()}
              {premium.canceled ? (
                <p className="text-xs text-orange-500">⏳ {t('profile.premiumCancelPending')}</p>
              ) : (
                <button onClick={handleCancelPremium} disabled={canceling} className="text-xs text-red-500 underline disabled:opacity-50">
                  {canceling ? t('profile.checking') : t('profile.premiumCancel')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✅ {t('profile.premiumBadge')}</li>
                <li>✅ {t('profile.premiumCommunity')}</li>
                <li>🔜 {t('profile.premiumSmart')}</li>
              </ul>
              <button onClick={handlePremium} disabled={paying} className="w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                <Zap size={16} /> {paying ? t('profile.checking') : t('profile.premiumSubscribe')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {showDice && (
        <DiceGame
          diceAvailable={diceAvailable}
          onRoll={async () => {
            const res = await fetch('/api/attendance/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pi_uid: user.uid }) })
            if (!res.ok) return null
            return await res.json()
          }}
          onXpEarned={(xp) => { setAttendance(prev => prev ? { ...prev, week_xp: prev.week_xp + xp, total_xp: prev.total_xp + xp } : null) }}
          onClose={() => { setShowDice(false); fetch(`/api/attendance/dice?pi_uid=${user.uid}`).then(r => r.json()).then(d => setDiceAvailable(d.diceAvailable ?? 0)) }}
        />
      )}
      {showAdModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 text-center border-b">
              <p className="font-bold text-lg">{t('profile.attendanceComplete')}</p>
              <p className="text-violet-600 font-semibold mt-1">{t('profile.xpEarned', { xp: adXpEarned })}</p>
            </div>
            <div className="p-3">
              <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-1253412588313642" data-ad-slot="8355356529" data-ad-format="auto" data-full-width-responsive="true"
                ref={(el) => { if (el) { try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}) } catch {} } }} />
            </div>
            <div className="p-4 pt-2">
              <button onClick={() => setShowAdModal(false)} className="w-full py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm">{t('profile.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

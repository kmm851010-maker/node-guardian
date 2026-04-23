'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PiUser {
  uid: string
  username: string
}

interface AuthContextValue {
  user: PiUser | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Pi) {
      setIsLoading(false)
      return
    }
    window.Pi.init({ version: '2.0', sandbox: true })

    // 저장된 유저가 있으면 Pi SDK 세션도 자동 복원
    const saved = localStorage.getItem('pilink_user')
    if (saved) {
      window.Pi.authenticate(['username', 'payments'], async (payment: any) => {
        try {
          await fetch('/api/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction?.txid, pi_uid: payment.metadata?.pi_uid, nickname: '' }),
          })
        } catch {}
      }).then(async auth => {
        const piUser: PiUser = { uid: auth.user.uid, username: auth.user.username }
        localStorage.setItem('pilink_user', JSON.stringify(piUser))
        setUser(piUser)
        // 자동 복원 시에도 로그인 기록
        fetch('/api/user-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pi_uid: piUser.uid, nickname: piUser.username }),
        }).catch(() => {})
      }).catch(() => {
        // Pi Browser 아닌 환경에서는 localStorage 유저 그대로 사용
        setUser(JSON.parse(saved))
      }).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async () => {
    if (typeof window === 'undefined' || !window.Pi) {
      alert('Pi Browser에서 실행해주세요.')
      return
    }

    try {
      const auth = await window.Pi.authenticate(['username', 'payments'], async (payment: any) => {
        // 미완료 결제 자동 완료 처리
        try {
          await fetch('/api/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction?.txid, pi_uid: payment.metadata?.pi_uid, nickname: '' }),
          })
        } catch {}
      })
      const piUser: PiUser = { uid: auth.user.uid, username: auth.user.username }

      // node_profiles upsert
      await supabase.from('node_profiles').upsert(
        { pi_uid: piUser.uid, nickname: piUser.username },
        { onConflict: 'pi_uid' }
      )

      localStorage.setItem('pilink_user', JSON.stringify(piUser))
      setUser(piUser)

      // Pi Browser 로그인 기록
      await fetch('/api/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pi_uid: piUser.uid, nickname: piUser.username }),
      })

      // 푸시 알림 구독 요청
      await subscribePush(piUser.uid)
    } catch (e) {
      console.error('Pi Auth 실패:', e)
    }
  }

  const logout = () => {
    localStorage.removeItem('pilink_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

async function subscribePush(pi_uid: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const reg = await navigator.serviceWorker.ready
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pi_uid, subscription }),
  })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export const useAuth = () => useContext(AuthContext)

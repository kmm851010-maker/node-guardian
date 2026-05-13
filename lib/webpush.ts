import webpush from 'web-push'
import { supabaseServer } from '@/lib/supabase-server'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const PUSH_TITLE: Record<string, string> = {
  critical: '🚨 노드 이상 감지',
  warning:  '⚠️ 노드 경고',
  recovery: '✅ 노드 복구',
  info:     '🟢 노드 정보',
}

export async function sendPushToUser(pi_uid: string, severity: string, body: string) {
  const { data: subs } = await supabaseServer
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('pi_uid', pi_uid)

  if (!subs?.length) return

  const payload = JSON.stringify({
    title: PUSH_TITLE[severity] ?? '📡 PiLink',
    body,
  })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err: any) => {
        if (err.statusCode === 410) {
          await supabaseServer.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    )
  )
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendPushToUser } from '@/lib/webpush'
import { sendExpoToUser } from '@/lib/expopush'

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000   // 15분 이상 신호 없으면 오프라인
const REPEAT_INTERVAL_MS   = 60 * 60 * 1000   // 오프라인 지속 시 1시간마다 재알림

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret') ?? req.nextUrl.searchParams.get('secret')
  const auth   = req.headers.get('authorization')
  const cronOk = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`
  if (secret !== process.env.PILINK_API_SECRET && !cronOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: telegramSubs }, { data: expoSubs }] = await Promise.all([
    supabaseServer.from('telegram_subscriptions').select('pi_uid, chat_id'),
    supabaseServer.from('expo_push_tokens').select('pi_uid'),
  ])

  // 두 테이블의 pi_uid 합집합
  const piUidSet = new Set<string>()
  const chatIdMap: Record<string, string> = {}
  for (const s of telegramSubs ?? []) { piUidSet.add(s.pi_uid); chatIdMap[s.pi_uid] = s.chat_id }
  for (const s of expoSubs ?? []) { piUidSet.add(s.pi_uid) }

  const subs = Array.from(piUidSet).map(pi_uid => ({ pi_uid, chat_id: chatIdMap[pi_uid] ?? null }))

  if (subs.length === 0) return NextResponse.json({ ok: true, checked: 0 })

  const now = Date.now()
  const offlineThreshold = new Date(now - OFFLINE_THRESHOLD_MS).toISOString()

  let offlineAlerts = 0
  let recoveryAlerts = 0

  const BATCH_SIZE = 50
  const BATCH_DELAY_MS = 200

  const processSub = async (sub: { pi_uid: string; chat_id: string | null }) => {
    const { data: status } = await supabaseServer
      .from('node_status')
      .select('last_seen')
      .eq('pi_uid', sub.pi_uid)
      .maybeSingle()

    if (!status) return  // 노드 가디언 미설치 유저 → 스킵

    const isOffline = status.last_seen < offlineThreshold

    // 가장 최근 node_offline 이벤트
    const { data: lastOfflineEvent } = await supabaseServer
      .from('node_events')
      .select('id, created_at')
      .eq('pi_uid', sub.pi_uid)
      .eq('event_type', 'node_offline')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (isOffline) {
      if (!lastOfflineEvent) {
        // 최초 오프라인 감지
        await supabaseServer.from('node_events').insert({
          pi_uid: sub.pi_uid,
          event_type: 'node_offline',
          severity: 'critical',
          message: `노드 가디언 응답 없음 — PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`,
        })
        await Promise.allSettled([
          sub.chat_id ? sendTelegramMessage(sub.chat_id, `🔴 <b>노드 가디언 응답 없음</b>\n\nPC가 꺼졌거나 앱이 종료된 것 같습니다.\n⏱ 마지막 신호: ${timeAgo(status.last_seen)}\n\n당신의 노드가 멈춰있어요. 얼른 토끼굴로 복귀하세요!\n👉 <a href="https://linkpi.io">linkpi.io</a>`) : Promise.resolve(),
          sendPushToUser(sub.pi_uid, 'critical', `PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`),
          sendExpoToUser(sub.pi_uid, 'node_offline', '🔴 노드 가디언 응답 없음', `PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`),
        ])
        offlineAlerts++
      } else {
        // 이전 node_offline 이후 node_online이 없으면 아직 오프라인 → 재알림 체크
        const { data: recoveredEvent } = await supabaseServer
          .from('node_events')
          .select('id')
          .eq('pi_uid', sub.pi_uid)
          .eq('event_type', 'node_online')
          .gt('created_at', lastOfflineEvent.created_at)
          .limit(1)
          .maybeSingle()

        if (!recoveredEvent) {
          // 아직 오프라인 중 — 1시간마다 재알림
          const lastAlertAge = now - new Date(lastOfflineEvent.created_at).getTime()
          if (lastAlertAge >= REPEAT_INTERVAL_MS) {
            await supabaseServer.from('node_events').insert({
              pi_uid: sub.pi_uid,
              event_type: 'node_offline',
              severity: 'critical',
              message: `노드 가디언 응답 없음 — ${timeAgo(status.last_seen)}째 미복구 중`,
            })
            await Promise.allSettled([
              sub.chat_id ? sendTelegramMessage(sub.chat_id, `🔴 <b>[재알림] 노드 가디언 응답 없음</b>\n\n마지막 신호: ${timeAgo(status.last_seen)}\n⚠️ 아직 복구되지 않았습니다.\n\n당신의 노드가 멈춰있어요. 얼른 토끼굴로 복귀하세요!\n👉 <a href="https://linkpi.io">linkpi.io</a>`) : Promise.resolve(),
              sendPushToUser(sub.pi_uid, 'critical', `[재알림] 마지막 신호: ${timeAgo(status.last_seen)} — 아직 복구되지 않았습니다.`),
              sendExpoToUser(sub.pi_uid, 'node_offline', '🔴 [재알림] 노드 가디언 응답 없음', `마지막 신호: ${timeAgo(status.last_seen)} — 아직 복구되지 않았습니다.`),
            ])
            offlineAlerts++
          }
        } else {
          // 이전 offline → online 복구 이후 다시 오프라인 → 새 알림
          await supabaseServer.from('node_events').insert({
            pi_uid: sub.pi_uid,
            event_type: 'node_offline',
            severity: 'critical',
            message: `노드 가디언 응답 없음 — PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`,
          })
          await Promise.allSettled([
            sub.chat_id ? sendTelegramMessage(sub.chat_id, `🔴 <b>노드 가디언 응답 없음</b>\n\nPC가 꺼졌거나 앱이 종료된 것 같습니다.\n⏱ 마지막 신호: ${timeAgo(status.last_seen)}\n\n당신의 노드가 멈춰있어요. 얼른 토끼굴로 복귀하세요!\n👉 <a href="https://linkpi.io">linkpi.io</a>`) : Promise.resolve(),
            sendPushToUser(sub.pi_uid, 'critical', `PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`),
            sendExpoToUser(sub.pi_uid, 'node_offline', '🔴 노드 가디언 응답 없음', `PC가 꺼졌거나 앱이 종료된 것 같습니다. (마지막 신호: ${timeAgo(status.last_seen)})`),
          ])
          offlineAlerts++
        }
      }
    } else {
      // 온라인 — 직전에 오프라인이었다면 복구 알림
      if (lastOfflineEvent) {
        const { data: recoveredEvent } = await supabaseServer
          .from('node_events')
          .select('id')
          .eq('pi_uid', sub.pi_uid)
          .eq('event_type', 'node_online')
          .gt('created_at', lastOfflineEvent.created_at)
          .limit(1)
          .maybeSingle()

        if (!recoveredEvent) {
          await supabaseServer.from('node_events').insert({
            pi_uid: sub.pi_uid,
            event_type: 'node_online',
            severity: 'recovery',
            message: '노드 가디언 재접속 — 정상 모니터링이 재개됐습니다.',
          })
          await Promise.allSettled([
            sub.chat_id ? sendTelegramMessage(sub.chat_id, `✅ <b>노드 가디언 재접속</b>\n\n정상 모니터링이 재개됐습니다.\n\n다음 중단은 막을 수 있습니다.\n운영자들의 노하우가 커뮤니티에 쌓이고 있어요.\n👉 <a href="https://linkpi.io">linkpi.io</a>`) : Promise.resolve(),
            sendPushToUser(sub.pi_uid, 'recovery', '노드 가디언 재접속 — 정상 모니터링이 재개됐습니다.'),
            sendExpoToUser(sub.pi_uid, 'node_online', '✅ 노드 가디언 재접속', '정상 모니터링이 재개됐습니다.'),
          ])
          recoveryAlerts++
        }
      }
    }
  }

  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const batch = subs.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(batch.map(sub => processSub(sub)))
    if (i + BATCH_SIZE < subs.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return NextResponse.json({ ok: true, checked: subs.length, offlineAlerts, recoveryAlerts })
}

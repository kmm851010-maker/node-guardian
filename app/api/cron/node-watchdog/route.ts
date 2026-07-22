export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendPushToUser } from '@/lib/webpush'
import { sendExpoToUser } from '@/lib/expopush'
import { st, getUserLocale, ServerLocale } from '@/lib/i18n/server'

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000
const REPEAT_INTERVAL_MS   = 60 * 60 * 1000

function timeAgo(iso: string, locale: ServerLocale) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (locale === 'ko') {
    if (diff < 60) return `${diff}초 전`
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }
  if (locale === 'zh-TW') {
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`
    return `${Math.floor(diff / 86400)}天前`
  }
  if (locale === 'vi') {
    if (diff < 60) return `${diff} giây trước`
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    return `${Math.floor(diff / 86400)} ngày trước`
  }
  // en
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
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

  const piUidSet = new Set<string>()
  const chatIdMap: Record<string, string> = {}
  for (const s of telegramSubs ?? []) { piUidSet.add(s.pi_uid); chatIdMap[s.pi_uid] = s.chat_id }
  for (const s of expoSubs ?? []) { piUidSet.add(s.pi_uid) }

  const subs = Array.from(piUidSet).map(pi_uid => ({ pi_uid, chat_id: chatIdMap[pi_uid] ?? null }))

  if (subs.length === 0) return NextResponse.json({ ok: true, checked: 0 })

  // Fetch user locales
  const allPiUids = subs.map(s => s.pi_uid)
  const { data: profiles } = await supabaseServer
    .from('node_profiles')
    .select('nickname, locale')
    .in('nickname', allPiUids)
  const localeMap: Record<string, ServerLocale> = {}
  for (const p of profiles ?? []) {
    localeMap[p.nickname] = getUserLocale(p.locale)
  }

  const now = Date.now()
  const offlineThreshold = new Date(now - OFFLINE_THRESHOLD_MS).toISOString()

  let offlineAlerts = 0
  let recoveryAlerts = 0

  const BATCH_SIZE = 50
  const BATCH_DELAY_MS = 200

  const processSub = async (sub: { pi_uid: string; chat_id: string | null }) => {
    const locale = localeMap[sub.pi_uid] ?? 'ko'

    const { data: status } = await supabaseServer
      .from('node_status')
      .select('last_seen')
      .eq('pi_uid', sub.pi_uid)
      .maybeSingle()

    if (!status) return

    const isOffline = status.last_seen < offlineThreshold
    const lastSeen = timeAgo(status.last_seen, locale)

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
        await supabaseServer.from('node_events').insert({
          pi_uid: sub.pi_uid, event_type: 'node_offline', severity: 'critical',
          message: st('node.offline.event', locale, { lastSeen }),
        })
        await Promise.allSettled([
          sub.chat_id ? sendTelegramMessage(sub.chat_id, st('node.offline.telegram', locale, { lastSeen })) : Promise.resolve(),
          sendPushToUser(sub.pi_uid, 'critical', st('node.offline.body', locale, { lastSeen })),
          sendExpoToUser(sub.pi_uid, 'node_offline', st('push.offline.title', locale, { nickname: sub.pi_uid }), st('node.offline.body', locale, { lastSeen })),
        ])
        offlineAlerts++
      } else {
        const { data: recoveredEvent } = await supabaseServer
          .from('node_events').select('id').eq('pi_uid', sub.pi_uid).eq('event_type', 'node_online')
          .gt('created_at', lastOfflineEvent.created_at).limit(1).maybeSingle()

        if (!recoveredEvent) {
          const lastAlertAge = now - new Date(lastOfflineEvent.created_at).getTime()
          if (lastAlertAge >= REPEAT_INTERVAL_MS) {
            await supabaseServer.from('node_events').insert({
              pi_uid: sub.pi_uid, event_type: 'node_offline', severity: 'critical',
              message: st('node.offline.repeat.event', locale, { lastSeen }),
            })
            await Promise.allSettled([
              sub.chat_id ? sendTelegramMessage(sub.chat_id, st('node.offline.repeat.telegram', locale, { lastSeen })) : Promise.resolve(),
              sendPushToUser(sub.pi_uid, 'critical', st('node.offline.repeat.body', locale, { lastSeen })),
              sendExpoToUser(sub.pi_uid, 'node_offline', st('push.offline.repeat.title', locale, { nickname: sub.pi_uid }), st('node.offline.repeat.body', locale, { lastSeen })),
            ])
            offlineAlerts++
          }
        } else {
          await supabaseServer.from('node_events').insert({
            pi_uid: sub.pi_uid, event_type: 'node_offline', severity: 'critical',
            message: st('node.offline.event', locale, { lastSeen }),
          })
          await Promise.allSettled([
            sub.chat_id ? sendTelegramMessage(sub.chat_id, st('node.offline.telegram', locale, { lastSeen })) : Promise.resolve(),
            sendPushToUser(sub.pi_uid, 'critical', st('node.offline.body', locale, { lastSeen })),
            sendExpoToUser(sub.pi_uid, 'node_offline', st('push.offline.title', locale, { nickname: sub.pi_uid }), st('node.offline.body', locale, { lastSeen })),
          ])
          offlineAlerts++
        }
      }
    } else {
      if (lastOfflineEvent) {
        const { data: recoveredEvent } = await supabaseServer
          .from('node_events').select('id').eq('pi_uid', sub.pi_uid).eq('event_type', 'node_online')
          .gt('created_at', lastOfflineEvent.created_at).limit(1).maybeSingle()

        if (!recoveredEvent) {
          await supabaseServer.from('node_events').insert({
            pi_uid: sub.pi_uid, event_type: 'node_online', severity: 'recovery',
            message: st('node.online.event', locale),
          })
          await Promise.allSettled([
            sub.chat_id ? sendTelegramMessage(sub.chat_id, st('node.online.telegram', locale)) : Promise.resolve(),
            sendPushToUser(sub.pi_uid, 'recovery', st('node.online.body', locale)),
            sendExpoToUser(sub.pi_uid, 'node_online', st('push.online.title', locale, { nickname: sub.pi_uid }), st('node.online.body', locale)),
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

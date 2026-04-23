export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization 헤더로 호출
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && req.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 모든 텔레그램 구독자 조회
  const { data: subs } = await supabaseServer
    .from('telegram_subscriptions')
    .select('pi_uid, chat_id')

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      // 이번 주 이벤트 수
      const { count } = await supabaseServer
        .from('node_events')
        .select('*', { count: 'exact', head: true })
        .eq('pi_uid', sub.pi_uid)
        .gte('created_at', weekAgo)

      // 현재 노드 상태
      const { data: status } = await supabaseServer
        .from('node_status')
        .select('process_status, port_status, last_seen')
        .eq('nickname', sub.pi_uid)
        .maybeSingle()

      const procIcon = !status ? '⚫' : status.process_status === 'healthy' ? '🟢' : status.process_status === 'warning' ? '🟡' : '🔴'
      const portIcon = !status ? '⚫' : status.port_status === 'healthy' ? '🟢' : status.port_status === 'partial' ? '🟡' : '🔴'
      const lastSeen = status ? timeAgo(status.last_seen) : '없음'

      await sendTelegramMessage(
        sub.chat_id,
        `📊 <b>주간 노드 리포트</b>\n\n` +
        `${procIcon} 프로세스: ${!status ? '데이터 없음' : status.process_status === 'healthy' ? '정상' : '이상'}\n` +
        `${portIcon} 포트: ${!status ? '데이터 없음' : status.port_status === 'healthy' ? '정상' : '이상'}\n` +
        `🕐 마지막 신호: ${lastSeen}\n` +
        `📋 이번 주 이벤트: ${count ?? 0}건\n\n` +
        `이번 주 내 노드, 잘 버텼나요?\n다른 운영자들의 가동률과 비교해보세요.\n활발한 참여로 보상도 받을 수 있습니다 👉 <a href="https://linkpi.io">linkpi.io</a>`,
      )
      sent++
    })
  )

  return NextResponse.json({ ok: true, sent })
}

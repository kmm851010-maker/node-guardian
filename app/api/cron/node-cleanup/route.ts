export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 30일 이상 신호 없는 노드 상태 정리
const STALE_DAYS = 30

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const cronOk = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - STALE_DAYS * 86400 * 1000).toISOString()

  // 30일 이상 last_seen 없는 node_status 조회
  const { data: staleNodes, error: fetchError } = await supabaseServer
    .from('node_status')
    .select('pi_uid')
    .lt('last_seen', cutoff)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!staleNodes || staleNodes.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 })
  }

  // 구독(telegram, expo)이 없는 pi_uid만 삭제 (실제 사용자 보호)
  const staleUids = staleNodes.map(n => n.pi_uid)

  const [{ data: telegramSubs }, { data: expoSubs }] = await Promise.all([
    supabaseServer.from('telegram_subscriptions').select('pi_uid').in('pi_uid', staleUids),
    supabaseServer.from('expo_push_tokens').select('pi_uid').in('pi_uid', staleUids),
  ])

  const activeUids = new Set<string>([
    ...(telegramSubs ?? []).map(s => s.pi_uid),
    ...(expoSubs ?? []).map(s => s.pi_uid),
  ])

  // 구독 없는 유령 계정만 삭제
  const ghostUids = staleUids.filter(uid => !activeUids.has(uid))
  if (ghostUids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, protected: staleUids.length })
  }

  const { error: deleteError } = await supabaseServer
    .from('node_status')
    .delete()
    .in('pi_uid', ghostUids)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    deleted: ghostUids.length,
    protected: activeUids.size,
    ghost_uids: ghostUids,
  })
}

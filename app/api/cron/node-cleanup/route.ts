export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 30일 이상 비활성 노드 상태 정리 / node_events 30일 보관
const STALE_DAYS = 30

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const cronOk = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - STALE_DAYS * 86400 * 1000).toISOString()

  // node_events 2주 이상 된 것 삭제
  const { error: eventDeleteError, count: deletedEvents } = await supabaseServer
    .from('node_events')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)
  if (eventDeleteError) console.error('node_events cleanup error:', eventDeleteError.message)

  // 14일 이상 비활성 node_status 조회
  const { data: staleNodes, error: fetchError } = await supabaseServer
    .from('node_status')
    .select('pi_uid')
    .lt('last_seen', cutoff)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!staleNodes || staleNodes.length === 0)
    return NextResponse.json({ ok: true, deleted_nodes: 0, deleted_events: deletedEvents ?? 0 })

  const staleUids = staleNodes.map(n => n.pi_uid)

  // 유료 프리미엄 구독자 보호
  const { data: premiumUsers } = await supabaseServer
    .from('premium_users')
    .select('pi_uid')
    .in('pi_uid', staleUids)
    .gt('expires_at', new Date().toISOString())

  const subscribedUids = new Set<string>(
    (premiumUsers ?? []).map(s => s.pi_uid)
  )

  const toDelete = staleUids.filter(uid => !subscribedUids.has(uid))
  if (toDelete.length === 0)
    return NextResponse.json({ ok: true, deleted_nodes: 0, deleted_events: deletedEvents ?? 0, protected: subscribedUids.size })

  const { error: deleteError, count: deletedNodes } = await supabaseServer
    .from('node_status')
    .delete({ count: 'exact' })
    .in('pi_uid', toDelete)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    deleted_nodes: deletedNodes ?? 0,
    deleted_events: deletedEvents ?? 0,
    protected: subscribedUids.size,
  })
}

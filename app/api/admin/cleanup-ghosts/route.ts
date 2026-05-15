export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 전체 node_status 조회
  const { data: allNodes, error } = await supabaseServer
    .from('node_status')
    .select('pi_uid, last_seen')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cutoff7d = new Date(Date.now() - 7 * 86400 * 1000).toISOString()

  // 삭제 후보: UUID 형식 or 7일 이상 비활성
  const candidates = (allNodes ?? []).filter(n =>
    UUID_RE.test(n.pi_uid) || n.last_seen < cutoff7d
  ).map(n => n.pi_uid)

  if (candidates.length === 0)
    return NextResponse.json({ ok: true, deleted: 0 })

  // 구독 있는 계정 보호
  const [{ data: telegramSubs }, { data: expoSubs }] = await Promise.all([
    supabaseServer.from('telegram_subscriptions').select('pi_uid').in('pi_uid', candidates),
    supabaseServer.from('expo_push_tokens').select('pi_uid').in('pi_uid', candidates),
  ])

  const activeUids = new Set<string>([
    ...(telegramSubs ?? []).map(s => s.pi_uid),
    ...(expoSubs ?? []).map(s => s.pi_uid),
  ])

  const toDelete = candidates.filter(uid => !activeUids.has(uid))

  if (toDelete.length === 0)
    return NextResponse.json({ ok: true, deleted: 0, protected: activeUids.size })

  const { error: delError } = await supabaseServer
    .from('node_status')
    .delete()
    .in('pi_uid', toDelete)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    deleted: toDelete.length,
    protected: activeUids.size,
    deleted_uids: toDelete,
  })
}

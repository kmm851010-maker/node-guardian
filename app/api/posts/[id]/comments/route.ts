export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { addXp, getLevel } from '@/lib/xp'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('post_comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with display_name and avatar_url — primary by nickname, secondary by pi_uid
  const nicknames = [...new Set((data ?? []).map((c: any) => c.nickname as string))]
  const { data: profilesByNick } = nicknames.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name, avatar_url').in('nickname', nicknames)
    : { data: [] }
  const profileMapByNick = Object.fromEntries((profilesByNick ?? []).map((p: any) => [p.nickname, p]))

  const unmatchedUids = [...new Set((data ?? []).filter((c: any) => !profileMapByNick[c.nickname]).map((c: any) => c.author_uid as string))]
  const profileMapByUid: Record<string, any> = {}
  if (unmatchedUids.length) {
    const { data: profilesByUid } = await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name, avatar_url').in('pi_uid', unmatchedUids)
    for (const p of (profilesByUid ?? [])) profileMapByUid[(p as any).pi_uid] = p
  }

  // XP / 레벨 조회
  const allProfiles = [...Object.values(profileMapByNick), ...Object.values(profileMapByUid)]
  const xpUids = [...new Set(allProfiles.map((p: any) => p.pi_uid as string).filter(Boolean))]
  const xpMap: Record<string, number> = {}
  if (xpUids.length > 0) {
    const { data: xpRows } = await supabaseServer
      .from('attendance').select('pi_uid, xp_earned').in('pi_uid', xpUids)
    for (const r of (xpRows ?? [])) xpMap[r.pi_uid] = (xpMap[r.pi_uid] ?? 0) + r.xp_earned
  }

  const enriched = (data ?? []).map((c: any) => {
    const profile = profileMapByNick[c.nickname] ?? profileMapByUid[c.author_uid]
    const totalXp = xpMap[profile?.pi_uid] ?? 0
    const level = totalXp > 0 ? getLevel(totalXp) : null
    return { ...c, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null, level }
  })

  return NextResponse.json({ data: enriched })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { author_uid, nickname, content, parent_id } = await req.json()
  if (!author_uid || !nickname || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('post_comments')
    .insert({ post_id: id, author_uid, nickname, content, parent_id: parent_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseServer.rpc('increment_comments', { post_id: id })
  await addXp(author_uid, 3) // 댓글 작성 +3 XP

  const { data: profile } = await supabaseServer
    .from('node_profiles')
    .select('display_name, avatar_url')
    .or(`pi_uid.eq.${author_uid},nickname.eq.${nickname}`)
    .maybeSingle()

  return NextResponse.json({ data: { ...data, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null } })
}

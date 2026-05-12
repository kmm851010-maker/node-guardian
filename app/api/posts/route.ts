export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const excludeType = searchParams.get('exclude_type')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = supabaseServer
    .from('pilink_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('post_type', type)
  if (excludeType) query = query.neq('post_type', excludeType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with display_name and avatar_url — primary by nickname, secondary by pi_uid
  const nicknames = [...new Set((data ?? []).map((p: any) => p.nickname as string))]
  const { data: profilesByNick } = nicknames.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, nickname, display_name, avatar_url').in('nickname', nicknames)
    : { data: [] }
  const profileMapByNick = Object.fromEntries((profilesByNick ?? []).map((p: any) => [p.nickname, p]))

  // Secondary: pi_uid lookup for posts whose nickname didn't match
  const unmatchedUids = [...new Set((data ?? []).filter((p: any) => !profileMapByNick[p.nickname]).map((p: any) => p.author_uid as string))]
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

  const enriched = (data ?? []).map((p: any) => {
    const profile = profileMapByNick[p.nickname] ?? profileMapByUid[p.author_uid]
    const totalXp = xpMap[profile?.pi_uid] ?? 0
    const level = totalXp > 0 ? Math.min(100, Math.floor(totalXp / 50) + 1) : null
    return { ...p, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null, level }
  })

  return NextResponse.json({ data: enriched, hasMore: (data?.length ?? 0) === limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { author_uid, nickname, post_type, title, content, image_url } = body

  if (!author_uid || !nickname || !title || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('pilink_posts')
    .insert({ author_uid, nickname, post_type: post_type ?? 'general', title, content, image_url: image_url ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabaseServer
    .from('node_profiles')
    .select('display_name, avatar_url')
    .eq('nickname', nickname)
    .maybeSingle()

  return NextResponse.json({ data: { ...data, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null } })
}

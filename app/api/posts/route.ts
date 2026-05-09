import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = supabaseServer
    .from('pilink_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('post_type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with display_name and avatar_url from node_profiles (join by nickname — more reliable than pi_uid)
  const nicknames = [...new Set((data ?? []).map((p: any) => p.nickname as string))]
  const { data: profiles } = nicknames.length
    ? await supabaseServer.from('node_profiles').select('nickname, display_name, avatar_url').in('nickname', nicknames)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.nickname, p]))
  const enriched = (data ?? []).map((p: any) => ({
    ...p,
    display_name: profileMap[p.nickname]?.display_name ?? null,
    avatar_url: profileMap[p.nickname]?.avatar_url ?? null,
  }))

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

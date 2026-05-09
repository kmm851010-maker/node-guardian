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

  // Enrich with display_name and avatar_url from node_profiles
  const authorUids = [...new Set((data ?? []).map((p: any) => p.author_uid as string))]
  const { data: profiles } = authorUids.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, display_name, avatar_url').in('pi_uid', authorUids)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.pi_uid, p]))
  const enriched = (data ?? []).map((p: any) => ({
    ...p,
    display_name: profileMap[p.author_uid]?.display_name ?? null,
    avatar_url: profileMap[p.author_uid]?.avatar_url ?? null,
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
  return NextResponse.json({ data })
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('post_comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with display_name and avatar_url from node_profiles
  const authorUids = [...new Set((data ?? []).map((c: any) => c.author_uid as string))]
  const { data: profiles } = authorUids.length
    ? await supabaseServer.from('node_profiles').select('pi_uid, display_name, avatar_url').in('pi_uid', authorUids)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.pi_uid, p]))
  const enriched = (data ?? []).map((c: any) => ({
    ...c,
    display_name: profileMap[c.author_uid]?.display_name ?? null,
    avatar_url: profileMap[c.author_uid]?.avatar_url ?? null,
  }))

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
  return NextResponse.json({ data })
}

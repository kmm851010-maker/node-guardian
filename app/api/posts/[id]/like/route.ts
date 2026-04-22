export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { author_uid } = await req.json()
  if (!author_uid) return NextResponse.json({ error: 'author_uid required' }, { status: 400 })

  const { id: post_id } = await params

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabaseServer
    .from('post_likes')
    .select('post_id')
    .eq('post_id', post_id)
    .eq('author_uid', author_uid)
    .maybeSingle()

  if (existing) {
    // 좋아요 취소
    await supabaseServer.from('post_likes').delete().eq('post_id', post_id).eq('author_uid', author_uid)
    await supabaseServer.rpc('decrement_likes', { post_id })
    return NextResponse.json({ liked: false })
  } else {
    // 좋아요
    await supabaseServer.from('post_likes').insert({ post_id, author_uid })
    await supabaseServer.rpc('increment_likes', { post_id })
    return NextResponse.json({ liked: true })
  }
}

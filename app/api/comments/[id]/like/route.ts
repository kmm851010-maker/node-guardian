export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { author_uid } = await req.json()
  if (!author_uid) return NextResponse.json({ error: 'Missing author_uid' }, { status: 400 })

  const { error } = await supabaseServer
    .from('comment_likes')
    .insert({ comment_id: id, author_uid })

  if (error) {
    if (error.code === '23505') {
      // Already liked → unlike
      await supabaseServer
        .from('comment_likes')
        .delete()
        .eq('comment_id', id)
        .eq('author_uid', author_uid)
      await supabaseServer.rpc('decrement_comment_likes', { p_comment_id: id })
      return NextResponse.json({ liked: false })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseServer.rpc('increment_comment_likes', { p_comment_id: id })
  return NextResponse.json({ liked: true })
}

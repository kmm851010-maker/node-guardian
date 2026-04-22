export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 글 수정
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { author_uid, title, content } = await req.json()
  if (!author_uid || !title || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: post } = await supabaseServer
    .from('pilink_posts').select('author_uid').eq('id', id).single()
  if (post?.author_uid !== author_uid) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from('pilink_posts')
    .update({ title: title.trim(), content: content.trim() })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// 글 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const author_uid = searchParams.get('author_uid')
  if (!author_uid) return NextResponse.json({ error: 'Missing author_uid' }, { status: 400 })

  const { data: post } = await supabaseServer
    .from('pilink_posts').select('author_uid').eq('id', id).single()
  if (post?.author_uid !== author_uid) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // 관련 데이터 먼저 삭제
  const { data: commentRows } = await supabaseServer
    .from('post_comments').select('id').eq('post_id', id)
  if (commentRows?.length) {
    await supabaseServer.from('comment_likes')
      .delete().in('comment_id', commentRows.map(c => c.id))
  }
  await supabaseServer.from('post_comments').delete().eq('post_id', id)
  await supabaseServer.from('post_likes').delete().eq('post_id', id)
  await supabaseServer.from('post_views').delete().eq('post_id', id)
  await supabaseServer.from('best_answer_bonuses').delete().eq('post_id', id)
  await supabaseServer.from('pilink_posts').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}

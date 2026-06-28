export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { author_uid, content } = await req.json()
  if (!author_uid || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: comment } = await supabaseServer
    .from('post_comments').select('author_uid').eq('id', id).maybeSingle()
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.author_uid !== author_uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from('post_comments')
    .update({ content: content.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const author_uid = searchParams.get('author_uid')
  if (!author_uid) return NextResponse.json({ error: 'Missing author_uid' }, { status: 400 })

  const { data: comment } = await supabaseServer
    .from('post_comments').select('author_uid, post_id').eq('id', id).maybeSingle()
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.author_uid !== author_uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 대댓글 수 파악
  const { data: replies } = await supabaseServer
    .from('post_comments').select('id').eq('parent_id', id)
  const replyCount = (replies ?? []).length

  // 대댓글 삭제
  if (replyCount > 0) {
    await supabaseServer.from('post_comments').delete().eq('parent_id', id)
  }

  // 댓글 삭제
  const { error } = await supabaseServer.from('post_comments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 댓글 수 감소 (본댓글 + 대댓글)
  const totalDeleted = 1 + replyCount
  const { data: postRow } = await supabaseServer
    .from('posts').select('comments_count').eq('id', comment.post_id).single()
  if (postRow) {
    await supabaseServer.from('posts')
      .update({ comments_count: Math.max(0, (postRow.comments_count ?? 0) - totalDeleted) })
      .eq('id', comment.post_id)
  }

  return NextResponse.json({ ok: true, deletedReplies: replyCount })
}

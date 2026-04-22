export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { comment_id, author_uid, is_resolved } = await req.json()
  if (!comment_id || !author_uid) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // 질문 작성자 확인
  const { data: post } = await supabaseServer
    .from('pilink_posts')
    .select('author_uid, best_answer_comment_id')
    .eq('id', id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.author_uid !== author_uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (post.best_answer_comment_id) return NextResponse.json({ error: 'Already selected' }, { status: 400 })

  // 댓글 작성자 확인
  const { data: comment } = await supabaseServer
    .from('post_comments')
    .select('author_uid')
    .eq('id', comment_id)
    .single()
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  // 보너스 저장
  await supabaseServer
    .from('best_answer_bonuses')
    .insert({ post_id: id, comment_id, author_uid: comment.author_uid })

  // 게시글 업데이트
  await supabaseServer
    .from('pilink_posts')
    .update({ best_answer_comment_id: comment_id, is_resolved: is_resolved === true })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}

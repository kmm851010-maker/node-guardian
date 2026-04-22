export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendTelegramMessage } from '@/lib/telegram'

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

    // 게시글 작성자에게 텔레그램 알림
    const { data: post } = await supabaseServer
      .from('posts')
      .select('pi_uid')
      .eq('id', post_id)
      .maybeSingle()

    if (post?.pi_uid && post.pi_uid !== author_uid) {
      const { data: sub } = await supabaseServer
        .from('telegram_subscriptions')
        .select('chat_id')
        .eq('pi_uid', post.pi_uid)
        .maybeSingle()

      if (sub?.chat_id) {
        await sendTelegramMessage(
          sub.chat_id,
          `❤️ 회원님의 게시글에 좋아요가 달렸습니다!\n\n👉 <a href="https://pilink.vercel.app">pilink.vercel.app</a> 에서 확인`,
        )
      }
    }

    return NextResponse.json({ liked: true })
  }
}

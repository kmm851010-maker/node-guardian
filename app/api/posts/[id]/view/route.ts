export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { author_uid } = await req.json().catch(() => ({}))

  if (author_uid) {
    // 로그인 유저: 중복 조회 방지
    const { error } = await supabaseServer
      .from('post_views')
      .insert({ post_id: id, author_uid })
    if (error) return NextResponse.json({ ok: true }) // 이미 조회한 경우
  }

  await supabaseServer.rpc('increment_views', { post_id: id })
  return NextResponse.json({ ok: true })
}

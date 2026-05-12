export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pi_uid = searchParams.get('pi_uid')
  const username = searchParams.get('username') ?? ''
  const since = searchParams.get('since') ?? '1970-01-01T00:00:00.000Z'

  if (!pi_uid) return NextResponse.json({ hasNew: false, items: [] })

  const postMap: Record<string, any> = {}

  // 내 글
  const { data: myPosts } = await supabaseServer
    .from('pilink_posts')
    .select('id, title, post_type')
    .or(`author_uid.eq.${pi_uid},author_uid.eq.${username}`)

  const myPostIds = (myPosts ?? []).map((p: any) => p.id as string)
  for (const p of (myPosts ?? [])) postMap[p.id] = p

  // 내 댓글
  const { data: myComments } = await supabaseServer
    .from('post_comments')
    .select('id, post_id')
    .or(`author_uid.eq.${pi_uid},author_uid.eq.${username}`)

  const myCommentIds = (myComments ?? []).map((c: any) => c.id as string)

  // 내 글에 달린 새 댓글 (타인이 작성)
  const newCommentRows: any[] = []
  if (myPostIds.length > 0) {
    const { data } = await supabaseServer
      .from('post_comments')
      .select('id, post_id, content, author_uid, nickname, created_at')
      .in('post_id', myPostIds)
      .gt('created_at', since)
      .neq('author_uid', pi_uid)
      .neq('author_uid', username)
      .order('created_at', { ascending: false })
      .limit(15)
    for (const c of (data ?? [])) newCommentRows.push({ type: 'new_comment', ...c })
  }

  // 내 댓글에 달린 새 대댓글 (타인이 작성)
  const newReplyRows: any[] = []
  if (myCommentIds.length > 0) {
    const { data } = await supabaseServer
      .from('post_comments')
      .select('id, post_id, content, author_uid, nickname, created_at')
      .in('parent_id', myCommentIds)
      .gt('created_at', since)
      .neq('author_uid', pi_uid)
      .neq('author_uid', username)
      .order('created_at', { ascending: false })
      .limit(15)
    for (const r of (data ?? [])) newReplyRows.push({ type: 'new_reply', ...r })
  }

  // 대댓글 대상 글 제목 보완 (내 글이 아닌 경우)
  const extraPostIds = [...new Set(newReplyRows.map(r => r.post_id as string))].filter(id => !postMap[id])
  if (extraPostIds.length > 0) {
    const { data: extraPosts } = await supabaseServer
      .from('pilink_posts')
      .select('id, title, post_type')
      .in('id', extraPostIds)
    for (const p of (extraPosts ?? [])) postMap[p.id] = p
  }

  // 합치기 + 중복 제거(id 기준) + 정렬
  const seen = new Set<string>()
  const allItems = [...newCommentRows, ...newReplyRows]
    .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
    .map(item => ({
      ...item,
      post_title: postMap[item.post_id]?.title ?? '',
      post_type: postMap[item.post_id]?.post_type ?? 'general',
      content: (item.content ?? '').slice(0, 80),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20)

  // display_name 보강
  const nicknames = [...new Set(allItems.map(i => i.nickname as string))]
  const { data: profiles } = nicknames.length
    ? await supabaseServer.from('node_profiles').select('nickname, display_name').in('nickname', nicknames)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.nickname, p.display_name]))
  const enriched = allItems.map(i => ({ ...i, display_name: profileMap[i.nickname] ?? null }))

  return NextResponse.json({ hasNew: enriched.length > 0, items: enriched })
}

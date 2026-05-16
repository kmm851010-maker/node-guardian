export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 점수 기준: 좋아요×1 + 채택×5 + 받은댓글×1 + 조회수÷10
const SCORE_WEIGHTS = { like: 1, bestAnswer: 5, comment: 1, viewsPer: 10 }

function getWeekBounds() {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const sun = new Date(nowKST.getTime() - day * 86400000)
  const y = sun.getUTCFullYear()
  const m = sun.getUTCMonth()
  const d = sun.getUTCDate()

  const startUTC = new Date(Date.UTC(y, m, d, -9, 0, 0))
  const endUTC = new Date(startUTC.getTime() + 7 * 86400000 - 1000)
  const weekStart = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return { startUTC, endUTC, weekStart }
}

async function runCalculation(weekStart: string, startUTC: Date, endUTC: Date, force = false) {
  if (!force) {
    const { data: existing } = await supabaseServer
      .from('weekly_rankings')
      .select('id')
      .eq('week_start', weekStart)
      .limit(1)
    if (existing && existing.length > 0) return { ok: true, message: 'Already calculated' }
  } else {
    await supabaseServer.from('weekly_rankings').delete().eq('week_start', weekStart)
  }

  const start = startUTC.toISOString()
  const end = endUTC.toISOString()

  // 1. 이번주 받은 좋아요 (게시글 작성자 기준)
  const { data: weekLikes } = await supabaseServer
    .from('pilink_likes')
    .select('post_id')
    .gte('created_at', start)
    .lte('created_at', end)

  const likedPostIds = [...new Set((weekLikes ?? []).map((l: any) => l.post_id))]
  const likedPostsData = likedPostIds.length > 0
    ? (await supabaseServer.from('pilink_posts').select('id, author_uid, nickname').in('id', likedPostIds)).data ?? []
    : []

  const postAuthorMap: Record<string, { author_uid: string; nickname: string }> = {}
  for (const p of likedPostsData) postAuthorMap[p.id] = { author_uid: p.author_uid, nickname: p.nickname }

  const likesPerUser: Record<string, number> = {}
  for (const like of weekLikes ?? []) {
    const author = postAuthorMap[(like as any).post_id]
    if (!author) continue
    likesPerUser[author.author_uid] = (likesPerUser[author.author_uid] ?? 0) + 1
  }

  // 2. 이번주 채택된 답변
  const { data: weekBestAnswers } = await supabaseServer
    .from('best_answer_bonuses')
    .select('author_uid')
    .gte('created_at', start)
    .lte('created_at', end)

  const bestAnswersPerUser: Record<string, number> = {}
  for (const ba of weekBestAnswers ?? []) {
    bestAnswersPerUser[(ba as any).author_uid] = (bestAnswersPerUser[(ba as any).author_uid] ?? 0) + 1
  }

  // 3. 이번주 받은 댓글 (게시글 작성자 기준, 자기 댓글 제외)
  const { data: weekComments } = await supabaseServer
    .from('post_comments')
    .select('post_id, author_uid')
    .gte('created_at', start)
    .lte('created_at', end)

  const commentedPostIds = [...new Set((weekComments ?? []).map((c: any) => c.post_id))]
  const commentedPostsData = commentedPostIds.length > 0
    ? (await supabaseServer.from('pilink_posts').select('id, author_uid').in('id', commentedPostIds)).data ?? []
    : []

  const commentPostAuthorMap: Record<string, string> = {}
  for (const p of commentedPostsData) commentPostAuthorMap[p.id] = p.author_uid

  const commentsPerUser: Record<string, number> = {}
  for (const c of weekComments ?? []) {
    const postAuthor = commentPostAuthorMap[(c as any).post_id]
    if (!postAuthor || postAuthor === (c as any).author_uid) continue
    commentsPerUser[postAuthor] = (commentsPerUser[postAuthor] ?? 0) + 1
  }

  // 4. 이번주 작성된 게시글의 조회수
  const { data: weekPosts } = await supabaseServer
    .from('pilink_posts')
    .select('author_uid, nickname, views')
    .gte('created_at', start)
    .lte('created_at', end)

  const viewsPerUser: Record<string, number> = {}
  const nicknameMap: Record<string, string> = {}
  for (const p of weekPosts ?? []) {
    viewsPerUser[(p as any).author_uid] = (viewsPerUser[(p as any).author_uid] ?? 0) + (p as any).views
    nicknameMap[(p as any).author_uid] = (p as any).nickname
  }
  for (const p of likedPostsData) nicknameMap[p.author_uid] = p.nickname

  // 전체 활동 유저 집계
  const allUids = new Set([
    ...Object.keys(likesPerUser),
    ...Object.keys(bestAnswersPerUser),
    ...Object.keys(commentsPerUser),
    ...Object.keys(viewsPerUser),
  ])
  if (allUids.size === 0) return { ok: true, message: 'No activity this week' }

  // 닉네임 보완
  const missingUids = [...allUids].filter(uid => !nicknameMap[uid])
  if (missingUids.length > 0) {
    const { data: profiles } = await supabaseServer
      .from('node_profiles').select('pi_uid, nickname').in('pi_uid', missingUids)
    for (const p of profiles ?? []) nicknameMap[p.pi_uid] = p.nickname
  }

  const allUsers = [...allUids].map(uid => {
    const likes = likesPerUser[uid] ?? 0
    const bestAnswers = bestAnswersPerUser[uid] ?? 0
    const comments = commentsPerUser[uid] ?? 0
    const viewScore = Math.floor((viewsPerUser[uid] ?? 0) / SCORE_WEIGHTS.viewsPer)
    const totalScore = likes * SCORE_WEIGHTS.like + bestAnswers * SCORE_WEIGHTS.bestAnswer + comments * SCORE_WEIGHTS.comment + viewScore
    return { pi_uid: uid, nickname: nicknameMap[uid] ?? uid, total_likes: likes, best_answer_count: bestAnswers, comment_count: comments, view_score: viewScore, total_score: totalScore }
  })

  allUsers.sort((a, b) => b.total_score - a.total_score)

  const rows = allUsers.map((u, i) => ({
    week_start: weekStart,
    rank: i + 1,
    pi_uid: u.pi_uid,
    nickname: u.nickname,
    total_likes: u.total_likes,
    best_answer_count: u.best_answer_count,
    comment_count: u.comment_count,
    view_score: u.view_score,
    total_score: u.total_score,
  }))

  const { error: insertError } = await supabaseServer.from('weekly_rankings').insert(rows)
  if (insertError) return { error: insertError.message }

  return { ok: true, count: rows.length, weekStart }
}

// 수동 호출 (POST) - { force: true } 로 재계산 가능
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-pilink-secret')
  if (secret !== process.env.PILINK_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const { weekStart, startUTC, endUTC } = getWeekBounds()
  const result = await runCalculation(weekStart, startUTC, endUTC, body.force === true)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

// Vercel cron (GET)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { weekStart, startUTC, endUTC } = getWeekBounds()
  const result = await runCalculation(weekStart, startUTC, endUTC)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

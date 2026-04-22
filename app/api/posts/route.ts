import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')  // 'qna' | 'brag' | 'general' | 'issue'
  const limit = parseInt(searchParams.get('limit') ?? '30')

  let query = supabaseServer
    .from('pilink_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('post_type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { author_uid, nickname, post_type, title, content, image_url } = body

  if (!author_uid || !nickname || !title || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('pilink_posts')
    .insert({ author_uid, nickname, post_type: post_type ?? 'general', title, content, image_url: image_url ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

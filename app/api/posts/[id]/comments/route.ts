export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseServer
    .from('post_comments')
    .select('*')
    .eq('post_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { author_uid, nickname, content, parent_id } = await req.json()
  if (!author_uid || !nickname || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('post_comments')
    .insert({ post_id: params.id, author_uid, nickname, content, parent_id: parent_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

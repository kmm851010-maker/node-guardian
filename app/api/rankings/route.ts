export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET: 가장 최근에 계산된 주 랭킹 반환 (week_start 파라미터로 특정 주 지정 가능)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start')

  if (weekStart) {
    const { data, error } = await supabaseServer
      .from('weekly_rankings')
      .select('*')
      .eq('week_start', weekStart)
      .order('rank', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, weekStart })
  }

  // week_start 미지정 시 가장 최근 계산된 주 반환
  const { data, error } = await supabaseServer
    .from('weekly_rankings')
    .select('*')
    .order('week_start', { ascending: false })
    .order('rank', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mostRecent = data?.[0]?.week_start ?? null
  const filtered = mostRecent ? data.filter(r => r.week_start === mostRecent) : []

  return NextResponse.json({ data: filtered, weekStart: mostRecent })
}

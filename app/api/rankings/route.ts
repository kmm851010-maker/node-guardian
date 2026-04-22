export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function getWeekStartDate(): string {
  const nowKST = new Date(Date.now() + 9 * 3600000)
  const day = nowKST.getUTCDay()
  const sun = new Date(nowKST.getTime() - day * 86400000)
  const y = sun.getUTCFullYear()
  const m = String(sun.getUTCMonth() + 1).padStart(2, '0')
  const d = String(sun.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// GET: 현재 주 랭킹 조회 (또는 지정 week_start)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start') ?? getWeekStartDate()

  const { data, error } = await supabaseServer
    .from('weekly_rankings')
    .select('*')
    .eq('week_start', weekStart)
    .order('rank', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, weekStart })
}

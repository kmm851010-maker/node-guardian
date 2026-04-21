import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// 푸시 구독 등록
export async function POST(req: NextRequest) {
  const { pi_uid, subscription } = await req.json()

  if (!pi_uid || !subscription?.endpoint) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('push_subscriptions')
    .upsert({
      pi_uid,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'pi_uid,endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 푸시 구독 해제
export async function DELETE(req: NextRequest) {
  const { pi_uid, endpoint } = await req.json()

  await supabaseServer
    .from('push_subscriptions')
    .delete()
    .eq('pi_uid', pi_uid)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}

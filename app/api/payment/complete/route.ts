import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const PI_API_KEY = process.env.PI_API_KEY ?? ''
const PI_API_BASE = 'https://api.minepi.com'

// Pi SDK → 서버: 결제 완료 + 프리미엄 등록
export async function POST(req: NextRequest) {
  const { paymentId, txid, pi_uid, nickname } = await req.json()

  if (!paymentId || !txid) {
    return NextResponse.json({ error: 'Missing paymentId or txid' }, { status: 400 })
  }

  // Pi API 결제 완료 처리
  const res = await fetch(`${PI_API_BASE}/v2/payments/${paymentId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${PI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ txid }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  // 프리미엄 30일 등록
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseServer
    .from('premium_users')
    .upsert({
      pi_uid,
      nickname,
      payment_id: paymentId,
      amount_pi: 1,
      expires_at,
    }, { onConflict: 'pi_uid' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expires_at })
}

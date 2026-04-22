export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const PI_API_KEY = process.env.PI_API_KEY ?? ''
const PI_API_BASE = 'https://api.minepi.com/v2'

export async function POST(req: NextRequest) {
  try {
    const { paymentId, txid, pi_uid, nickname } = await req.json()
    if (!paymentId || !txid) {
      return NextResponse.json({ error: 'paymentId and txid required' }, { status: 400 })
    }

    const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[payment/complete] Pi API error:', text)
      return NextResponse.json({ error: text }, { status: res.status })
    }

    // 프리미엄 30일 등록
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseServer
      .from('premium_users')
      .upsert({
        pi_uid,
        nickname,
        payment_id: paymentId,
        amount_pi: 1,
        expires_at,
      }, { onConflict: 'pi_uid' })

    return NextResponse.json({ ok: true, expires_at })
  } catch (err) {
    console.error('[payment/complete]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

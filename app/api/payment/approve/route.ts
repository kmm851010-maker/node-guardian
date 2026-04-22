export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const PI_API_KEY = process.env.PI_API_KEY ?? ''
const PI_API_BASE = 'https://api.minepi.com/v2'

export async function POST(req: NextRequest) {
  try {
    const { paymentId } = await req.json()
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
    }

    const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[payment/approve] Pi API error:', text)
      return NextResponse.json({ error: text }, { status: res.status })
    }

    return NextResponse.json({ status: 'approved' })
  } catch (err) {
    console.error('[payment/approve]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

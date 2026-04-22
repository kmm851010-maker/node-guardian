import { NextRequest, NextResponse } from 'next/server'

const PI_API_KEY = process.env.PI_API_KEY ?? ''
const PI_API_BASE = 'https://api.minepi.com'

// Pi SDK → 서버: 결제 승인
export async function POST(req: NextRequest) {
  const { paymentId } = await req.json()

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
  }

  const res = await fetch(`${PI_API_BASE}/v2/payments/${paymentId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${PI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ data })
}

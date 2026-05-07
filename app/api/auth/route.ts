export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken required' }, { status: 400 })
    }

    const res = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'invalid token' }, { status: 401 })
    }

    const piUser = await res.json()
    return NextResponse.json({ uid: piUser.uid, username: piUser.username })
  } catch (err) {
    console.error('[auth]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

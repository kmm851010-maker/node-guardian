export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const REQUIRED_VERSION = process.env.GUARDIAN_MIN_VERSION ?? '2.0.0'
const DOWNLOAD_URL = 'https://github.com/kmm851010-maker/node-guardian/releases/latest/download/NodeGuardian.exe'

export async function GET() {
  return NextResponse.json({
    required_version: REQUIRED_VERSION,
    download_url: DOWNLOAD_URL,
  })
}

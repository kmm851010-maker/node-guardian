export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// 새 빌드 후 GitHub Release에 올리면 자동으로 최신 버전 다운로드됨
const APK_URL = 'https://github.com/kmm851010-maker/linkpi-monitor-apk/releases/latest/download/LinkPiMonitor.apk'
const LATEST_VERSION = '1.0.0'
const MINIMUM_VERSION = '1.0.0'

export async function GET() {
  return NextResponse.json({
    latest: LATEST_VERSION,
    minimum: MINIMUM_VERSION,
    apk_url: APK_URL,
    message: '',
  })
}

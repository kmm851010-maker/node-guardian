export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// 새 APK 빌드 후 이 값들을 업데이트하세요
const LATEST_VERSION = '1.0.0'
const MINIMUM_VERSION = '1.0.0'
const APK_URL = 'https://expo.dev/artifacts/eas/k2gPVa7QunnjF8n11kRWRt.apk'
const UPDATE_MESSAGE = ''

export async function GET() {
  return NextResponse.json({
    latest: LATEST_VERSION,
    minimum: MINIMUM_VERSION,
    apk_url: APK_URL,
    message: UPDATE_MESSAGE,
  })
}

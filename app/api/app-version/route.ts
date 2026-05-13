export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const LATEST_VERSION = '1.0.0'
const MINIMUM_VERSION = '1.0.0'
const FALLBACK_APK_URL = 'https://expo.dev/artifacts/eas/nDyFxB6h6Kc2posCCz1rrP.apk'
const EAS_PROJECT_ID = 'b7e3696c-d2d6-4822-924d-03ce5b6384b5'

async function getLatestApkUrl(): Promise<string> {
  const token = process.env.EXPO_ACCESS_TOKEN
  if (!token) return FALLBACK_APK_URL

  try {
    const res = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query {
          app {
            byId(appId: "${EAS_PROJECT_ID}") {
              builds(limit: 1, filter: { platform: ANDROID, status: FINISHED }) {
                edges {
                  node {
                    artifacts {
                      buildUrl
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
      next: { revalidate: 3600 }, // 1시간 캐시
    })

    const json = await res.json()
    const url = json?.data?.app?.byId?.builds?.edges?.[0]?.node?.artifacts?.buildUrl
    return url ?? FALLBACK_APK_URL
  } catch {
    return FALLBACK_APK_URL
  }
}

export async function GET() {
  const apk_url = await getLatestApkUrl()
  return NextResponse.json({
    latest: LATEST_VERSION,
    minimum: MINIMUM_VERSION,
    apk_url,
    message: '',
  })
}

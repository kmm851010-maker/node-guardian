import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import SwRegister from '@/components/sw-register'
import { AuthProvider } from '@/contexts/auth-context'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LinkPi | Pi Node 모니터링 & 커뮤니티',
  description: 'Pi Node 운영자들을 위한 실시간 모니터링 & 커뮤니티 플랫폼',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.className}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1253412588313642" crossOrigin="anonymous" strategy="afterInteractive" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <SwRegister />
      </body>
    </html>
  )
}

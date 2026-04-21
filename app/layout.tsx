import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import SwRegister from '@/components/sw-register'
import { AuthProvider } from '@/contexts/auth-context'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LinkPi — Pi Node 운영자 커뮤니티',
  description: 'Pi Node 운영자들을 위한 모니터링 & 커뮤니티 플랫폼',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.className}>
      <head>
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
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

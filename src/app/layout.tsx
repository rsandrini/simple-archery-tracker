import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import UserHeader from '@/components/ui/UserHeader'
import { SyncBanner } from '@/components/ui/SyncBanner'
import { PostHogProvider } from '@/components/monitoring/PostHogProvider'
import { PageviewTracker } from '@/components/monitoring/PageviewTracker'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quiver',
  description: 'Archery training tracker',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Runs before React hydration to avoid flash of wrong theme
const themeScript = `
try {
  var t = localStorage.getItem('quiver-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <SessionProvider>
          <PostHogProvider>
            <Suspense fallback={null}>
              <PageviewTracker />
            </Suspense>
            <ThemeProvider>
              <UserHeader />
              {children}
            </ThemeProvider>
          </PostHogProvider>
        </SessionProvider>
        <SyncBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </body>
    </html>
  )
}

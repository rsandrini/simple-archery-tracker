import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
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

const themeScript = `
try {
  var t = localStorage.getItem('quiver-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let locale = 'en'
  try {
    const h = await headers()
    const headerLocale = h.get('X-NEXT-INTL-LOCALE')
    if (headerLocale) locale = headerLocale
  } catch {
    // fallback to default
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </body>
    </html>
  )
}

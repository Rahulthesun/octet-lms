import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import LenisProvider from '@/components/providers/LenisProvider'

// One typeface for the whole app; globals.css builds --font-sans from --font-geist.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

export const metadata: Metadata = {
  title: 'Chemistry@OCTET — Spread True Science',
  description: 'The premier chemistry learning institute for 11th and 12th grade students. Master physical, organic, and inorganic chemistry with expert guidance.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        {/* Static, stationary favicon — the animated canvas version added page
            latency, so it's intentionally left non-animating. */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  )
}
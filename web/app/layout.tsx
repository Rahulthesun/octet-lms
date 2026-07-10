import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import LenisProvider from '@/components/providers/LenisProvider'
import AnimatedFavicon from '@/components/ui/AnimatedFavicon'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-data', display: 'swap' })

export const metadata: Metadata = {
  title: 'Chemistry@OCTET — Spread True Science',
  description: 'The premier chemistry learning institute for 11th and 12th grade students. Master physical, organic, and inorganic chemistry with expert guidance.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
        {/* Static icon (shown before JS / in inactive tabs); AnimatedFavicon
            takes over with the live atom while the page is open. */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <AnimatedFavicon />
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  )
}

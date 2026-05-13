import type { Metadata } from 'next'
import './globals.css'
import LenisProvider from '@/components/providers/LenisProvider'

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
    <html lang="en">
      <body>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  )
}

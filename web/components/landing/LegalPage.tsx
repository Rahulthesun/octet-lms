// Shared shell for the public Privacy Policy and Terms of Service pages.

import type { ReactNode } from 'react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-primary mb-3">{title}</h2>
      <div className="space-y-3 text-[16px] leading-relaxed text-primary/80 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:underline">
        {children}
      </div>
    </section>
  )
}

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="bg-bg pt-32 pb-20 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-2">{title}</h1>
          <p className="text-sm text-muted mb-10">Last updated: {updated}</p>
          {children}
        </article>
      </main>
      <Footer />
    </>
  )
}

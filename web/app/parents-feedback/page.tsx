import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import ParentFeedbackForm from '@/components/landing/ParentFeedbackForm'

export const metadata: Metadata = {
  title: "Parent's Feedback — Chemistry@OCTET",
  description: 'Parents can share their expectations, comments and rating for Chemistry@OCTET.',
}

export default function ParentsFeedbackPage() {
  return (
    <>
      <Navbar />
      <main className="bg-bg pt-32 pb-20 px-4 sm:px-6">
        <ParentFeedbackForm />
      </main>
      <Footer />
    </>
  )
}

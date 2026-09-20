import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import ChemistryBanner from '@/components/landing/ChemistryBanner'
import AboutUs from '@/components/landing/AboutUs'
import ElementsSection from '@/components/landing/ElementsSection'
import Instructor from '@/components/landing/Instructor'
import VideoSection from '@/components/landing/VideoSection'
import Reviews from '@/components/landing/Reviews'
import ParentsMessage from '@/components/landing/ParentsMessage'
import ToStudents from '@/components/landing/ToStudents'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="bg-bg min-h-screen">
      <Navbar />
      <Hero />
      <ChemistryBanner />
      <ElementsSection />
      <Instructor />
      <VideoSection />
      <Reviews />
      <ParentsMessage />
      <ToStudents />
      <AboutUs />
      <CTASection />
      <Footer />
    </main>
  )
}

import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import AboutUs from '@/components/landing/AboutUs'
import CoursesSection from '@/components/landing/CoursesSection'
import VideoSection from '@/components/landing/VideoSection'
import Reviews from '@/components/landing/Reviews'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="bg-bg min-h-screen">
      <Navbar />
      <Hero />
      <AboutUs />
      <CoursesSection />
      <VideoSection />
      <Reviews />
      <Footer />
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  {
    label: 'Courses',
    href: '/courses',
    sub: [
      { label: '11th Grade Chemistry', href: '/courses#grade-11' },
      { label: '12th Grade Chemistry', href: '/courses#grade-12' },
      { label: 'JEE Chemistry',        href: '/courses#jee'      },
      { label: 'NEET Chemistry',       href: '/courses#neet'     },
    ],
  },
  {
    label: 'Learn',
    href: '/learn',
    sub: [
      { label: 'How We Teach',    href: '/learn#approach'  },
      { label: 'Class Schedule',  href: '/learn#schedule'  },
      { label: 'Exam Pathways',   href: '/learn#exams'     },
      { label: 'Student Resources', href: '/learn#resources' },
    ],
  },
  {
    label: 'About',
    href: '/about',
    sub: [
      { label: 'Our Story',       href: '/about#story'   },
      { label: 'The Founder',     href: '/about#founder' },
      { label: 'Vision & Mission', href: '/about#vision'  },
      { label: 'Photo Gallery',   href: '/about#gallery' },
    ],
  },
  {
    label: 'Resources',
    href: '/resources',
    sub: [
      { label: 'Syllabus Updates', href: '/resources#syllabus'      },
      { label: 'Chemistry Blog',   href: '/resources#blog'          },
      { label: 'Exam Schedule',    href: '/resources#exams'         },
      { label: 'Notifications',    href: '/resources#notifications' },
    ],
  },
  {
    label: 'Outcomes',
    href: '/outcomes',
    sub: [
      { label: 'Top Results',    href: '/outcomes#results'  },
      { label: 'Score Analysis', href: '/outcomes#analysis' },
      { label: 'Parent Reviews', href: '/outcomes#reviews'  },
    ],
  },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeLink, setActiveLink] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#f8f9ed]/98 backdrop-blur-md shadow-[0_2px_20px_rgba(94,64,117,0.12)]'
          : 'bg-[#f8f9ed]/90 backdrop-blur-sm border-b border-[#e9deb5]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between py-2.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
              <circle cx="18" cy="18" r="16" stroke="#5e4075" strokeWidth="1.8" />
              <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(60 18 18)" />
              <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(-60 18 18)" />
              <circle cx="18" cy="18" r="3" fill="#5e4075" />
            </svg>
          </div>
          <span className="text-[#5e4075] text-lg tracking-wide">
            Chemistry<span className="text-[#8b6fa0]">@</span>OCTET
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => setActiveLink(link.label)}
              onMouseLeave={() => setActiveLink(null)}
            >
              <a
                href={link.href}
                className={`px-4 py-3 text-base text-[#5e4075] hover:text-[#3d2652] transition-colors duration-200 flex items-center gap-1.5 ${
                  activeLink === link.label ? 'text-[#3d2652]' : ''
                }`}
              >
                {link.label}
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${activeLink === link.label ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path d="M 2,4 L 6,8 L 10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>

              <AnimatePresence>
                {activeLink === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-[#f8f9ed] border border-[#e9deb5] rounded-xl shadow-[0_8px_30px_rgba(94,64,117,0.1)] py-2 overflow-hidden"
                  >
                    {link.sub.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        className="block px-5 py-3 text-[15px] text-[#5e4075] hover:bg-[#e9deb5]/50 transition-colors duration-150"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Register Button */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/login"
            className="text-base text-[#5e4075] hover:text-[#3d2652] transition-colors duration-200 px-4 py-3"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-7 py-3 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_2px_12px_rgba(94,64,117,0.25)] hover:shadow-[0_4px_20px_rgba(94,64,117,0.35)] hover:-translate-y-0.5"
          >
            Register Now
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-[#5e4075]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span className={`block w-full h-0.5 bg-[#5e4075] transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
            <span className={`block w-full h-0.5 bg-[#5e4075] transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-full h-0.5 bg-[#5e4075] transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-[#f8f9ed]/98 backdrop-blur-md border-t border-[#e9deb5] overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-3.5 text-base text-[#5e4075] border-b border-[#e9deb5]/50"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="text-center py-3.5 text-base text-[#5e4075] border border-[#5e4075] rounded-xl"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-center py-3.5 bg-[#5e4075] text-white text-base rounded-xl"
                  onClick={() => setMobileOpen(false)}
                >
                  Register Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

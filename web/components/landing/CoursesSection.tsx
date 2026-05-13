'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { landingCourses } from '@/lib/mockData'
import { ChemIcon } from '@/components/ui/PencilSVGs'

export default function CoursesSection() {
  return (
    <section id="courses" className="py-24 px-6" style={{ backgroundColor: '#f0ebe8' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3">What We Offer</p>
          <h2 className="text-3xl md:text-4xl text-[#5e4075] mb-4">
            Courses Built for
            <br />
            <span className="text-[#8b6fa0]">11th & 12th Grade Excellence</span>
          </h2>
          <p className="text-[#8b6fa0] text-base max-w-xl mx-auto">
            Each course is meticulously designed — from concept to exam — giving students everything they need in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {landingCourses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative bg-[#f8f9ed] rounded-2xl p-10 border border-[#d4c5e2]/60 hover:border-[#5e4075]/25 hover:shadow-[0_8px_32px_rgba(94,64,117,0.12)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-28 h-28 rounded-bl-full opacity-50 transition-all duration-300 group-hover:opacity-70"
                style={{ backgroundColor: course.color }}
              />
              <div
                className="relative w-16 h-16 rounded-xl flex items-center justify-center mb-8"
                style={{ backgroundColor: course.color }}
              >
                <ChemIcon icon={course.icon} width={42} height={42} color="#5e4075" />
              </div>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-[14px] px-3 py-1.5 rounded-full bg-[#5e4075]/10 text-[#5e4075] tracking-wide">
                  Grade {course.grade}
                </span>
                <span className="text-[14px] px-3 py-1.5 rounded-full bg-[#e9deb5] text-[#8b6fa0]">
                  {course.chapters} Chapters
                </span>
              </div>
              <h3 className="text-[#5e4075] text-lg mb-4">{course.title}</h3>
              <p className="text-[#8b6fa0] text-base leading-relaxed mb-8">{course.description}</p>
              <Link href="/register" className="inline-flex items-center gap-2 text-[#5e4075] text-[15px] group-hover:gap-3 transition-all duration-200">
                <span>Explore Course</span>
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 16 16" fill="none">
                  <path d="M 3,8 L 13,8 M 9,4 L 13,8 L 9,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-14"
        >
          <p className="text-[#8b6fa0] text-base">
            All courses include video lectures, notes, cheat sheets, formula sheets, and regular tests.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

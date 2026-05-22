'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import {
  IconDocument,
  IconBook,
  IconCalendar,
  IconStar,
} from '@/components/ui/SvgIcons'
import {
  AtomSVG,
  FlaskSVG,
  CompoundSVG,
  MicroscopeSVG,
} from '@/components/ui/PencilSVGs'

// ─── Types ────────────────────────────────────────────────────────────────────

type SyllabusUpdate = {
  board: string
  grade: string
  type: 'Addition' | 'Removal' | 'Revision' | 'New' | 'Confirmed'
  title: string
  description: string
  date: string
}

type BlogArticle = {
  category: string
  categoryBg: string
  title: string
  excerpt: string
  readTime: string
}

type ExamEvent = {
  event: string
  date: string
  status: 'Open' | 'Upcoming' | 'Closed' | 'Completed' | 'Announced'
}

type ExamGroup = {
  exam: string
  board: string
  accentBg: string
  accentBorder: string
  events: ExamEvent[]
}

type NotificationItem = {
  category: string
  categoryBg: string
  title: string
  description: string
  date: string
  isNew: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const syllabusUpdates: SyllabusUpdate[] = [
  {
    board: 'NCERT',
    grade: 'Class 11',
    type: 'Revision',
    title: 'Environmental Chemistry Chapter Rationalised',
    description:
      'The 2024-25 NCERT Class 11 textbook rationalises Chapter 14 — Environmental Chemistry. Topics on stratospheric pollution are now designated as self-study material and are not examinable.',
    date: 'Aug 2024',
  },
  {
    board: 'NCERT',
    grade: 'Class 12',
    type: 'Addition',
    title: 'Biodegradable Polymers Section Expanded',
    description:
      'Chapter 15 (Polymers) now includes an expanded section on green chemistry and biodegradable polymers — polylactic acid (PLA) and polyhydroxybutyrate (PHB) are new additions for 2024-25.',
    date: 'Aug 2024',
  },
  {
    board: 'CBSE',
    grade: 'Class 12',
    type: 'Revision',
    title: 'Practical Examination Guidelines Revised',
    description:
      'CBSE has revised the Class 12 Chemistry practical examination guidelines for 2024-25. Salt analysis now includes additional confirmatory tests. Total marks distribution remains unchanged.',
    date: 'Sep 2024',
  },
  {
    board: 'TN Board',
    grade: '11th & 12th',
    type: 'New',
    title: 'Samacheer Kalvi 2024 Edition Released',
    description:
      'The Tamil Nadu State Board has released updated textbooks for both 11th and 12th grade Chemistry. New application-level numericals have been added to Physical Chemistry chapters.',
    date: 'Jun 2024',
  },
  {
    board: 'JEE Advanced',
    grade: 'UG',
    type: 'Removal',
    title: 'Nuclear Chemistry Removed from JEE Advanced 2025',
    description:
      'The JEE Advanced 2025 syllabus confirms Nuclear Chemistry is no longer in scope. All other Physical, Organic and Inorganic Chemistry topics remain unchanged from previous years.',
    date: 'Nov 2024',
  },
  {
    board: 'NEET UG',
    grade: 'UG',
    type: 'Confirmed',
    title: 'NEET UG 2025 Syllabus Unchanged',
    description:
      'NTA has confirmed the NEET UG 2025 Chemistry syllabus remains fully NCERT-based (Classes 11 and 12). No additions or removals have been made from the previous year\'s syllabus.',
    date: 'Oct 2024',
  },
]

const blogArticles: BlogArticle[] = [
  {
    category: 'Concept Deep Dive',
    categoryBg: '#d4c5e2',
    title: 'Why Is the Periodic Table Arranged the Way It Is?',
    excerpt:
      'Most students memorise the periodic table — few understand the elegant logic behind its arrangement. We explore how quantum mechanics, electron configuration and atomic radius all converge into a single chart.',
    readTime: '8 min read',
  },
  {
    category: 'JEE Prep',
    categoryBg: '#e9deb5',
    title: 'Top 10 Named Reactions Every JEE Aspirant Must Know',
    excerpt:
      'From Aldol Condensation to Birch Reduction — named reactions appear every year in JEE. This guide covers the 10 most frequently tested, with mechanisms and memory strategies for each.',
    readTime: '12 min read',
  },
  {
    category: 'Board Exams',
    categoryBg: '#daeae4',
    title: 'How to Score 90+ in Class 12 Chemistry Board Exams',
    excerpt:
      'A practical, chapter-by-chapter strategy for CBSE and TN Board students. Which topics to prioritise, how to structure answers for maximum marks, and how to use the final two weeks effectively.',
    readTime: '6 min read',
  },
  {
    category: 'NEET Prep',
    categoryBg: '#c8e0da',
    title: 'NEET Chemistry: Chapter-wise Weightage Analysis (2020–2024)',
    excerpt:
      'Five years of NEET question papers analysed to show exactly which Chemistry chapters carry the most marks. Use this data to make smarter decisions about where to spend your study time.',
    readTime: '7 min read',
  },
  {
    category: 'Concept Deep Dive',
    categoryBg: '#d4c5e2',
    title: 'Chemical Bonding: From Ionic to Covalent and Beyond',
    excerpt:
      'Chemical bonding is one of the most fundamental — and most misunderstood — chapters in chemistry. We break it down from first principles, including a clear explanation of why MO Theory matters for exams.',
    readTime: '10 min read',
  },
  {
    category: 'Study Skills',
    categoryBg: '#e9deb5',
    title: 'The Right Way to Use NCERT for JEE and NEET Preparation',
    excerpt:
      'NCERT is not just a textbook — it is the most important resource for both JEE and NEET. Here is how to read it actively, annotate effectively, and extract maximum value from every chapter.',
    readTime: '5 min read',
  },
]

const examGroups: ExamGroup[] = [
  {
    exam: 'JEE Mains 2025',
    board: 'NTA',
    accentBg: '#d4c5e2',
    accentBorder: '#c0afd4',
    events: [
      { event: 'Session 1 — Registration', date: 'Nov 1 – Dec 4, 2024', status: 'Closed' },
      { event: 'Session 1 — Examination', date: 'Jan 22 – 31, 2025', status: 'Completed' },
      { event: 'Session 2 — Registration', date: 'Feb 2025', status: 'Open' },
      { event: 'Session 2 — Examination', date: 'Apr 1 – 15, 2025', status: 'Upcoming' },
    ],
  },
  {
    exam: 'JEE Advanced 2025',
    board: 'IIT (JAB)',
    accentBg: '#e9deb5',
    accentBorder: '#d4c890',
    events: [
      { event: 'Registration (JEE Mains qualified)', date: 'Apr 23 – May 4, 2025', status: 'Upcoming' },
      { event: 'Examination', date: 'May 18, 2025', status: 'Upcoming' },
      { event: 'Result Declaration', date: 'Jun 2025 (Tentative)', status: 'Upcoming' },
    ],
  },
  {
    exam: 'NEET UG 2025',
    board: 'NTA',
    accentBg: '#c8e0da',
    accentBorder: '#a0c4ba',
    events: [
      { event: 'Application Form Release', date: 'Feb 7, 2025', status: 'Open' },
      { event: 'Last Date to Apply', date: 'Mar 7, 2025', status: 'Upcoming' },
      { event: 'Examination', date: 'May 4, 2025', status: 'Upcoming' },
      { event: 'Result', date: 'Jun 2025 (Tentative)', status: 'Upcoming' },
    ],
  },
  {
    exam: 'CBSE Board 2025',
    board: 'CBSE',
    accentBg: '#daeae4',
    accentBorder: '#b8d4cc',
    events: [
      { event: 'Date Sheet Released', date: 'Jan 11, 2025', status: 'Announced' },
      { event: 'Practical Exams', date: 'Jan – Feb 2025', status: 'Completed' },
      { event: 'Theory Exams Begin', date: 'Feb 15, 2025', status: 'Upcoming' },
      { event: 'Chemistry Paper (Class 12)', date: 'Mar 4, 2025', status: 'Upcoming' },
    ],
  },
  {
    exam: 'TN State Board 2025',
    board: 'Tamil Nadu DGEHS',
    accentBg: '#e9deb5',
    accentBorder: '#d4c890',
    events: [
      { event: 'Practical Exams (Class 12)', date: 'Jan 2025', status: 'Completed' },
      { event: 'Theory Exams Begin', date: 'Mar 3, 2025', status: 'Upcoming' },
      { event: 'Chemistry Paper (Class 12)', date: 'Mar 10, 2025 (Expected)', status: 'Upcoming' },
    ],
  },
]

const notifications: NotificationItem[] = [
  {
    category: 'JEE',
    categoryBg: '#d4c5e2',
    title: 'JEE Mains 2025 Session 2 Registration Now Open',
    description:
      'NTA has opened the Session 2 registration window. Last date to apply is 25 February 2025. Chemistry paper: 30 questions (20 MCQ + 10 Numerical), all from the revised 2025 syllabus.',
    date: 'Feb 6, 2025',
    isNew: true,
  },
  {
    category: 'Chemistry@OCTET',
    categoryBg: '#e9deb5',
    title: 'New Batch Starting — March 2025',
    description:
      'A new JEE + NEET combined preparation batch is starting in March 2025. Both online and offline seats are limited to 20 students per batch. Register early to secure your place.',
    date: 'Feb 3, 2025',
    isNew: true,
  },
  {
    category: 'CBSE',
    categoryBg: '#daeae4',
    title: 'Class 12 Chemistry Exam Scheduled for 4 March 2025',
    description:
      'CBSE has officially confirmed Chemistry (Code: 043) on 4 March 2025. Practicals must be completed before 14 February 2025. Full date sheet available on cbse.gov.in.',
    date: 'Jan 11, 2025',
    isNew: false,
  },
  {
    category: 'NEET',
    categoryBg: '#c8e0da',
    title: 'NEET UG 2025 Application Process Begins',
    description:
      'NTA has released the official NEET UG 2025 notification. Exam is on 4 May 2025. Chemistry will have 45 questions from both Class 11 and 12 NCERT Sections A and B.',
    date: 'Jan 7, 2025',
    isNew: false,
  },
  {
    category: 'JEE',
    categoryBg: '#d4c5e2',
    title: 'JEE Mains Session 1 Results Declared',
    description:
      'JEE Mains Session 1 2025 results are now live on jeemain.nta.ac.in. Best of two session scores will be used for the final merit list. Check your scorecard and percentile.',
    date: 'Feb 12, 2025',
    isNew: false,
  },
  {
    category: 'Chemistry@OCTET',
    categoryBg: '#e9deb5',
    title: 'Free Doubt Session Every Saturday',
    description:
      'All enrolled students get a free live doubt-clearing session every Saturday from 4:00 PM to 5:30 PM. Both online and offline students are welcome. No prior registration needed.',
    date: 'Jan 2, 2025',
    isNew: false,
  },
  {
    category: 'TN Board',
    categoryBg: '#daeae4',
    title: 'TN Board 2025 Timetable Expected Soon',
    description:
      'The Tamil Nadu Directorate of Government Examinations is expected to release the Class 12 public examination timetable shortly. Students are advised to complete portions by end of January.',
    date: 'Dec 28, 2024',
    isNew: false,
  },
  {
    category: 'Syllabus',
    categoryBg: '#d4c5e2',
    title: 'NCERT 2024-25 Rationalised Textbooks Now Available',
    description:
      'NCERT has published the updated 2024-25 textbooks for Class 11 and 12 Chemistry. Key changes: rationalisation of Environmental Chemistry (11th) and expansion of the Polymers chapter (12th).',
    date: 'Aug 15, 2024',
    isNew: false,
  },
]

// ─── Style Maps ───────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  Open:      'bg-[#daeae4] text-[#5e4075]',
  Upcoming:  'bg-[#e9deb5] text-[#5e4075]',
  Completed: 'bg-[#f8f9ed] text-[#8b6fa0] border border-[#d4c5e2]/60',
  Announced: 'bg-[#d4c5e2] text-[#5e4075]',
  Closed:    'bg-[#f8f9ed] text-[#8b6fa0] border border-[#d4c5e2]/60',
}

const typeStyles: Record<string, string> = {
  Addition:  'bg-[#daeae4] text-[#5e4075]',
  Revision:  'bg-[#e9deb5] text-[#5e4075]',
  New:       'bg-[#d4c5e2] text-[#5e4075]',
  Removal:   'bg-[#f8f9ed] text-[#8b6fa0] border border-[#d4c5e2]/60',
  Confirmed: 'bg-[#c8e0da] text-[#5e4075]',
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const tabs = [
  { id: 'syllabus',      label: 'Syllabus Updates', Icon: IconDocument },
  { id: 'blog',          label: 'Chemistry Blog',   Icon: IconBook     },
  { id: 'exams',         label: 'Exam Schedule',    Icon: IconCalendar },
  { id: 'notifications', label: 'Notifications',    Icon: IconStar     },
]

// ─── Tab Content Components ───────────────────────────────────────────────────

function SyllabusTab() {
  return (
    <div>
      <p className="text-base text-[#8b6fa0] leading-relaxed mb-8 max-w-2xl">
        Curriculum changes across NCERT, CBSE, TN State Board, JEE and NEET — explained so you know
        exactly what has changed and how it affects your preparation this year.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {syllabusUpdates.map((update, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.2) }}
            className="bg-white border border-[#d4c5e2]/60 rounded-2xl p-7 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(94,64,117,0.09)] transition-all duration-300"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1.5 rounded-full text-[14px] ${typeStyles[update.type]}`}>
                {update.type}
              </span>
              <span className="px-3 py-1.5 rounded-full text-[14px] bg-[#f8f9ed] border border-[#d4c5e2]/60 text-[#8b6fa0]">
                {update.board}
              </span>
              <span className="px-3 py-1.5 rounded-full text-[14px] bg-[#f8f9ed] border border-[#d4c5e2]/60 text-[#8b6fa0]">
                {update.grade}
              </span>
            </div>
            <h3 className="text-xl text-[#5e4075] leading-snug mb-3">{update.title}</h3>
            <p className="text-[15px] text-[#8b6fa0] leading-relaxed mb-4">{update.description}</p>
            <p className="text-[14px] text-[#8b6fa0]/60">Updated: {update.date}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-[14px] text-[#8b6fa0]/60 italic mt-8 text-center">
        Syllabus information is sourced from official board notifications and is updated as new announcements are made.
      </p>
    </div>
  )
}

function BlogTab() {
  return (
    <div>
      <p className="text-base text-[#8b6fa0] leading-relaxed mb-8 max-w-2xl">
        In-depth chemistry articles, exam strategies and study guides — written to help you understand
        concepts deeply and perform better in every exam you take.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogArticles.map((article, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.2) }}
            className="bg-white border border-[#d4c5e2]/60 rounded-2xl p-7 flex flex-col hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(94,64,117,0.09)] transition-all duration-300"
          >
            <span
              className="inline-block self-start px-3 py-1.5 rounded-full text-[14px] text-[#5e4075] mb-4"
              style={{ backgroundColor: article.categoryBg }}
            >
              {article.category}
            </span>
            <h3 className="text-xl text-[#5e4075] leading-snug mb-3 flex-1">
              {article.title}
            </h3>
            <p className="text-[15px] text-[#8b6fa0] leading-relaxed mb-5">{article.excerpt}</p>
            <div className="flex items-center justify-between pt-4 border-t border-[#e9deb5]/60 mt-auto">
              <span className="text-[14px] text-[#8b6fa0]/70">{article.readTime}</span>
              <span className="text-[14px] text-[#8b6fa0]/55 italic">Coming soon</span>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[14px] text-[#8b6fa0]/60 italic mt-8 text-center">
        Articles are published regularly. Check back for new content or reach out to suggest a topic.
      </p>
    </div>
  )
}

function ExamsTab() {
  return (
    <div>
      <p className="text-base text-[#8b6fa0] leading-relaxed mb-8 max-w-2xl">
        Key dates for board exams, JEE and NEET — registration windows, exam dates and result timelines
        all in one place. Always verify on the official board or NTA website before acting.
      </p>
      <div className="space-y-6">
        {examGroups.map((group, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.25) }}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${group.accentBorder}` }}
          >
            {/* Group header */}
            <div
              className="px-7 py-5 flex items-center justify-between flex-wrap gap-2"
              style={{ backgroundColor: group.accentBg }}
            >
              <div>
                <h3 className="text-xl text-[#5e4075]">{group.exam}</h3>
                <p className="text-[14px] text-[#8b6fa0] mt-0.5">{group.board}</p>
              </div>
            </div>
            {/* Events */}
            <div className="bg-white divide-y divide-[#e9deb5]/60">
              {group.events.map((event, j) => (
                <div
                  key={j}
                  className="px-7 py-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <span className="text-[15px] text-[#5e4075] flex-1 min-w-[160px]">
                    {event.event}
                  </span>
                  <span className="text-[15px] text-[#8b6fa0]">{event.date}</span>
                  <span
                    className={`px-3 py-1.5 rounded-full text-[14px] flex-shrink-0 ${statusStyles[event.status]}`}
                  >
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[14px] text-[#8b6fa0]/60 italic mt-8 text-center">
        Dates marked "Tentative" are estimated from previous year patterns. Verify on the official board or NTA website.
      </p>
    </div>
  )
}

function NotificationsTab() {
  return (
    <div>
      <p className="text-base text-[#8b6fa0] leading-relaxed mb-8 max-w-2xl">
        The latest on exam notifications, registration windows, new batches at Chemistry@OCTET and everything
        else a chemistry student needs to know — in one feed.
      </p>
      <div className="space-y-4">
        {notifications.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2) }}
            className="bg-white border border-[#d4c5e2]/60 rounded-2xl px-7 py-5 hover:shadow-[0_4px_20px_rgba(94,64,117,0.07)] transition-shadow duration-300"
          >
            <div className="flex items-start gap-5">
              {/* Date column — desktop */}
              <div className="hidden sm:flex flex-col items-end flex-shrink-0 pt-0.5" style={{ minWidth: '100px' }}>
                <span className="text-[14px] text-[#8b6fa0]/65 leading-snug text-right">{item.date}</span>
              </div>
              {/* Divider */}
              <div className="hidden sm:block w-px self-stretch bg-[#d4c5e2] flex-shrink-0" />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="px-3 py-1 rounded-full text-[14px] text-[#5e4075] flex-shrink-0"
                    style={{ backgroundColor: item.categoryBg }}
                  >
                    {item.category}
                  </span>
                  {item.isNew && (
                    <span className="px-2.5 py-1 rounded-full text-[14px] bg-[#5e4075] text-white flex-shrink-0">
                      New
                    </span>
                  )}
                  {/* Date — mobile only */}
                  <span className="text-[14px] text-[#8b6fa0]/65 sm:hidden">{item.date}</span>
                </div>
                <h3 className="text-base text-[#5e4075] mb-1.5">{item.title}</h3>
                <p className="text-[15px] text-[#8b6fa0] leading-relaxed">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<string>('syllabus')

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (tabs.some((t) => t.id === hash)) setActiveTab(hash)
  }, [])

  const handleTabChange = (id: string) => setActiveTab(id)

  const tabContent: Record<string, React.ReactNode> = {
    syllabus:      <SyllabusTab />,
    blog:          <BlogTab />,
    exams:         <ExamsTab />,
    notifications: <NotificationsTab />,
  }

  return (
    <main className="bg-[#f8f9ed] min-h-screen">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-40 pb-20 px-6 text-center relative overflow-hidden bg-[#f8f9ed]">
        <div className="absolute top-20 left-8 opacity-[0.07] pointer-events-none">
          <MicroscopeSVG width={180} height={180} color="#5e4075" />
        </div>
        <div className="absolute bottom-8 right-10 opacity-[0.07] pointer-events-none">
          <AtomSVG width={220} height={220} color="#5e4075" />
        </div>
        <div className="absolute top-48 right-[20%] opacity-[0.05] pointer-events-none">
          <CompoundSVG width={130} height={130} color="#5e4075" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-2.5 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#8b6fa0] animate-pulse" />
            <span className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase">
              Resources &amp; Guidance
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#8b6fa0] animate-pulse" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl text-[#5e4075] leading-tight mb-6"
          >
            Stay Informed.
            <br />
            <span className="text-[#8b6fa0]">Stay Ahead.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-base text-[#8b6fa0] max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Your one-stop chemistry guidance centre — syllabus updates, study articles, exam schedules
            and important notifications, all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { value: '5',     label: 'Exam Boards Covered' },
              { value: '6+',   label: 'Chemistry Articles'  },
              { value: 'Free', label: 'Access for All'       },
            ].map((s) => (
              <div
                key={s.label}
                className="px-6 py-3.5 bg-white border border-[#e9deb5] rounded-2xl text-center shadow-[0_2px_12px_rgba(94,64,117,0.06)]"
              >
                <div className="text-xl text-[#5e4075]">{s.value}</div>
                <div className="text-[14px] text-[#8b6fa0]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Tabs + Content ───────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Tab Pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
            className="flex flex-wrap gap-2.5 mb-10 justify-center"
          >
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-base transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-[#5e4075] text-white shadow-[0_2px_12px_rgba(94,64,117,0.25)]'
                    : 'bg-white border border-[#d4c5e2] text-[#8b6fa0] hover:border-[#5e4075]/40 hover:text-[#5e4075]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </motion.div>

          {/* Animated Content Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center bg-[#e9deb5]/30 border border-[#e9deb5] rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="absolute top-4 right-6 opacity-[0.08] pointer-events-none">
            <FlaskSVG width={120} height={120} color="#5e4075" />
          </div>
          <h2 className="text-3xl md:text-4xl text-[#5e4075] mb-4 relative">
            Have a Specific Question?
          </h2>
          <p className="text-base text-[#8b6fa0] mb-8 relative">
            Reach out to us directly — we are happy to guide you on courses, exams, or anything chemistry-related.
          </p>
          <div className="flex flex-wrap gap-4 justify-center relative">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_2px_12px_rgba(94,64,117,0.25)] hover:shadow-[0_4px_20px_rgba(94,64,117,0.35)] hover:-translate-y-0.5"
            >
              Enroll Now
            </Link>
            <a
              href="/#footer"
              className="px-8 py-3 border border-[#5e4075]/30 text-[#5e4075] text-base rounded-xl hover:border-[#5e4075]/60 transition-all duration-200"
            >
              Contact Us
            </a>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  )
}

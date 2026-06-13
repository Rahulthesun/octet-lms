'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── KPI data (aggregated from all sections) ──────────────────────────────────

const kpis = [
  { value: 20,    label: 'Total Students',      color: '#5e4075' },
  { value: 17,    label: 'Active Students',      color: '#3e7450' },
  { value: 3,     label: 'Blocked Students',     color: '#9e4a4a' },
  { value: 5,     label: 'Pending Applications', color: '#9e7438' },
  { value: '83%', label: 'Avg Attendance',       color: '#3e7450' },
  { value: 3,     label: 'Below 75% Att.',       color: '#9e4a4a' },
  { value: 4,     label: 'Tests Completed',      color: '#3e5e8a' },
  { value: 3,     label: 'Upcoming Tests',       color: '#9e7438' },
]

// ─── Quick-nav section tiles ───────────────────────────────────────────────────

const sections = [
  {
    href: '/admin/attendance',
    label: 'Attendance',
    desc: 'Mark daily attendance by grade and batch. Track percentage and flag at-risk students.',
    color: '#3e7450',
    bg: '#f0faf4',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 3,10 H 21 M 8,3 V 7 M 16,3 V 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M 7.5,15.5 L 10.5,18 L 17,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/tests',
    label: 'Test Results',
    desc: 'Schedule tests, upload question papers and answer keys, and record student scores.',
    color: '#3e5e8a',
    bg: '#f0f4fa',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
        <path d="M 7,3 H 5 Q 4,3 4,4 V 20 Q 4,21 5,21 H 19 Q 20,21 20,20 V 4 Q 20,3 19,3 H 17 M 7,3 Q 7,2 12,2 Q 17,2 17,3 M 7,3 Q 7,4 12,4 Q 17,4 17,3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 8,11 H 16 M 8,14 H 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 8,17.5 L 10,15.5 L 12.5,18 L 16,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/admin/students',
    label: 'Students',
    desc: 'Review new applications, approve or reject, and manage the student database.',
    color: '#5e4075',
    bg: '#f7f0ff',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 1,21 Q 1,16 9,16 Q 17,16 17,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="19.5" cy="9" r="3" stroke="currentColor" strokeWidth="1.3" />
        <path d="M 18,16 Q 23,16 23,21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/content',
    label: 'Content',
    desc: 'Upload and organise video lectures, notes, and question papers by grade and chapter.',
    color: '#9e7438',
    bg: '#faf5eb',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
        <path d="M 2,9 Q 2,8 3,8 L 10,8 L 12,6 L 21,6 Q 22,6 22,7 L 22,18 Q 22,19 21,19 L 3,19 Q 2,19 2,18 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 12,11 L 12,15.5 M 9.5,13 L 12,11 L 14.5,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

// ─── Storage bar ───────────────────────────────────────────────────────────────

function StorageBar() {
  const used = 24.8, total = 50
  const pct = (used / total) * 100
  return (
    <div className="bg-white shadow-sm px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base text-gray-600">Video Storage</span>
        <span className="text-base font-inter font-bold text-primary">
          {used} GB <span className="font-normal text-gray-400">/ {total} GB</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 overflow-hidden rounded-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      <p className="text-sm text-gray-400 mt-1.5">{(total - used).toFixed(1)} GB free</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  const router = useRouter()

  useEffect(() => {

    router.replace('/admin/content')

  }, [router])

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-base text-gray-600 mt-1">Welcome back, Admin.</p>
        </div>
        <p className="text-base text-gray-600 sm:text-right shrink-0">{today}</p>
      </div>

      {/* KPI pill chips */}
      <div>
        <p className="text-sm text-gray-600 uppercase tracking-widest mb-3">Overview</p>
        <div className="grid grid-cols-4 gap-3">
          {kpis.map(({ value, label, color }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-full py-3 shadow-sm"
            >
              <span className="text-2xl font-inter font-bold shrink-0" style={{ color }}>{value}</span>
              <span className="text-base text-gray-500 truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Storage */}
      <StorageBar />

      {/* Quick access */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Quick Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {sections.map(({ href, label, desc, color, bg, icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow group"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg, color }}
              >
                {icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                  {label}
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug">{desc}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
                Open {label}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
                  <path d="M 4,8 H 12 M 9,5 L 12,8 L 9,11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

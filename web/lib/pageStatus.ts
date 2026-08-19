// lib/pageStatus.ts

export type PageStatus = 'production' | 'testing'

export const PAGE_STATUS: Record<string, PageStatus> = {
  //'/admin': 'production',
  '/admin/content': 'production',
  '/admin/students': 'production',
  '/admin/attendance': 'production',
  '/admin/tests': 'testing',
  '/admin/online-classes': 'production',

  '/student': 'testing',
  '/student/notes': 'production',
  '/student/feedback': 'production',
  '/student/courses': 'production',
  '/student/attendance': 'production',
  '/student/profile': 'production',
  '/student/classes': 'production',

}

// Exact match only - unlisted paths default to 'testing'
export function getPageStatus(path: string): PageStatus {
  return PAGE_STATUS[path] ?? 'testing'
}

// Central rule: who can see what
export function canAccessPage(role: string | null, path: string): boolean {
  if (role === 'both') return true // sees everything, testing or not
  return getPageStatus(path) === 'production'
}
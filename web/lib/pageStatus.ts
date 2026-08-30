// lib/pageStatus.ts

export type PageStatus = 'production' | 'testing'

export const PAGE_STATUS: Record<string, PageStatus> = {
  '/admin': 'production',
  '/admin/content': 'production',
  '/admin/students': 'production',
  '/admin/attendance': 'production',
  '/admin/tests': 'production',
  '/admin/online-classes': 'production',
  '/admin/notifications': 'production',

  '/student': 'production',
  '/student/notes': 'production',
  '/student/feedback': 'production',
  '/student/courses': 'production',
  '/student/attendance': 'production',
  '/student/profile': 'production',
  '/student/classes': 'production',
  '/student/tests': 'production',
  '/student/notifications': 'production',

}

// Exact match first. Falls back to the longest registered path that is a
// genuine segment-boundary prefix of `path` — this is what makes dynamic
// sub-routes (e.g. /student/tests/[id]/exam, /admin/students/[id]) inherit
// their parent section's status instead of always defaulting to 'testing'
// just because their exact, ID-bearing URL was never in the dict.
export function getPageStatus(path: string): PageStatus {
  if (path in PAGE_STATUS) return PAGE_STATUS[path]

  let best: string | null = null
  for (const key of Object.keys(PAGE_STATUS)) {
    if ((path === key || path.startsWith(`${key}/`)) && (!best || key.length > best.length)) {
      best = key
    }
  }
  return best ? PAGE_STATUS[best] : 'testing'
}

// Central rule: who can see what
export function canAccessPage(role: string | null, path: string): boolean {
  if (role === 'both') return true // sees everything, testing or not
  return getPageStatus(path) === 'production'
}
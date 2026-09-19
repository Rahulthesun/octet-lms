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
  '/admin/profile': 'production',
  '/admin/alumni': 'production',
  '/admin/exams': 'production',

  '/student': 'production',
  '/student/notes': 'production',
  '/student/feedback': 'production',
  '/student/courses': 'production',
  '/student/attendance': 'production',
  '/student/profile': 'production',
  '/student/classes': 'production',
  '/student/tests': 'production',
  '/student/notifications': 'production',
  '/student/exam-documents': 'production',
}

// Roles that hold admin rights. 'both' is the full-access role (the Buildify
// account); 'admin' is a normal admin such as Mr. Raju's account once it is
// given the same role. 'developer' is deliberately NOT in this list: it only
// reaches developer screens such as analytics.
export const ADMIN_ROLES = ['admin', 'both']

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role)
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

// Central rule: who can see what.
//
// The "coming soon" gate exists to hide unreleased STUDENT-facing pages from
// students. It must never apply to an admin on the admin area: every admin
// role has to reach every /admin/* page whatever its release status, or a
// normal admin (not just the Buildify 'both' account) lands on a placeholder.
// That was the root cause of the admin -> "coming soon" bug when leaving
// guest mode: the page status gate was being applied to admin accounts.
export function canAccessPage(role: string | null, path: string): boolean {
  if (role === 'both') return true // sees everything, testing or not
  if (role === 'admin') {
    // Admin area: always. Student area: reachable (AuthGuard decides whether
    // an admin may actually stay there, i.e. only in Guest Mode).
    return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/student')
  }
  return getPageStatus(path) === 'production'
}

'use client'

// hooks/useGuestMode.ts
//
// "Guest mode" lets an admin preview the app exactly as a student would see
// it, without creating a separate student account. It is a purely
// client-side UI flag (localStorage) — it never grants a real student
// identity or extra data access; API calls the admin's browser makes while
// in guest mode still authenticate as the admin's own account.
//
// Only ever set to true by the admin-only toggle in AdminSidebar. Read by:
//   - AuthGuard (student layout)  — lets an 'admin' role through instead of
//     bouncing them back to /admin
//   - TestingGuard                — treats the admin as role 'both' so every
//     student page (including ones still marked "testing") renders normally
//   - student/layout.tsx          — shows a small exit bar so the admin can
//     get back out
//   - admin/layout.tsx            — self-heals by clearing the flag whenever
//     an admin page is visited, so it can never leak into a real session

import { useCallback, useEffect, useState } from 'react'

export const GUEST_MODE_STORAGE_KEY = 'octet_admin_guest_mode'
const GUEST_MODE_EVENT = 'octet-guest-mode-change'

/** Non-reactive read — safe to call outside React render (e.g. inside a guard's effect). */
export function isGuestModeActive(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true'
}

function writeGuestMode(value: boolean) {
  if (typeof window === 'undefined') return
  if (value) {
    window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true')
  } else {
    window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY)
  }
  window.dispatchEvent(new Event(GUEST_MODE_EVENT))
}

/** Imperative clear — used by admin/layout.tsx to self-heal on every admin page load. */
export function clearGuestMode() {
  writeGuestMode(false)
}

/** Reactive hook for components that render differently based on guest mode state. */
export function useGuestMode() {
  const [guestMode, setGuestModeState] = useState(false)

  useEffect(() => {
    setGuestModeState(isGuestModeActive())
    const handler = () => setGuestModeState(isGuestModeActive())
    window.addEventListener(GUEST_MODE_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(GUEST_MODE_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const setGuestMode = useCallback((value: boolean) => {
    writeGuestMode(value)
    setGuestModeState(value)
  }, [])

  return { guestMode, setGuestMode }
}

'use client'

// hooks/useGuestMode.ts
//
// "Guest mode" lets an admin preview the app exactly as a student would see
// it, without creating a separate student account. It is a purely
// client-side UI flag (a non-sensitive cookie) — it never grants a real
// student identity or extra data access; API calls the admin's browser
// makes while in guest mode still authenticate as the admin's own account.
//
// Stored as a cookie (not localStorage) specifically so the flag cannot be
// mistaken for — or made to imply — elevated access: it carries no secret,
// has a short expiry, and every reader (TestingGuard included) treats an
// admin in guest mode as a genuine student, never as a privileged role.
//
// Only ever set to true by the admin-only toggle in AdminSidebar. Read by:
//   - AuthGuard (student layout)  — lets an 'admin' role through instead of
//     bouncing them back to /admin
//   - TestingGuard                — while guest mode is on, an admin is
//     evaluated as role 'student' so they see EXACTLY what a real student
//     would (production pages only) — never the extra pages an internal
//     'both' role can reach. This is the whole point of the preview: it
//     must not show the admin anything a real student couldn't see.
//   - student/layout.tsx          — shows a small exit bar so the admin can
//     get back out
//   - admin/layout.tsx            — self-heals by clearing the flag whenever
//     an admin page is visited, so it can never leak into a real session

import { useCallback, useEffect, useState } from 'react'

export const GUEST_MODE_COOKIE = 'octet_admin_guest_mode'
const GUEST_MODE_EVENT = 'octet-guest-mode-change'
// Safety net only — the toggle and admin/layout.tsx's self-heal already
// clear this proactively. Bounds how long a forgotten/abandoned guest
// session can persist if a tab is left open.
const GUEST_MODE_MAX_AGE_SECONDS = 60 * 60 * 12

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  // No secret/session data — a readable, SameSite=Lax cookie is the right
  // trust level here, matching the "client-side UI flag only" contract.
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

/** Non-reactive read — safe to call outside React render (e.g. inside a guard's effect). */
export function isGuestModeActive(): boolean {
  return readCookie(GUEST_MODE_COOKIE) === 'true'
}

function writeGuestMode(value: boolean) {
  if (typeof document === 'undefined') return
  if (value) {
    writeCookie(GUEST_MODE_COOKIE, 'true', GUEST_MODE_MAX_AGE_SECONDS)
  } else {
    deleteCookie(GUEST_MODE_COOKIE)
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
    return () => {
      window.removeEventListener(GUEST_MODE_EVENT, handler)
    }
  }, [])

  const setGuestMode = useCallback((value: boolean) => {
    writeGuestMode(value)
    setGuestModeState(value)
  }, [])

  return { guestMode, setGuestMode }
}

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGuestMode, isGuestModeActive, clearGuestMode, GUEST_MODE_COOKIE } from '../useGuestMode'

function clearAllCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  })
}

describe('useGuestMode', () => {
  beforeEach(() => {
    clearAllCookies()
  })

  it('defaults to false when no cookie is set', () => {
    const { result } = renderHook(() => useGuestMode())
    expect(result.current.guestMode).toBe(false)
    expect(isGuestModeActive()).toBe(false)
  })

  it('setGuestMode(true) writes the cookie and updates state', () => {
    const { result } = renderHook(() => useGuestMode())

    act(() => {
      result.current.setGuestMode(true)
    })

    expect(result.current.guestMode).toBe(true)
    expect(isGuestModeActive()).toBe(true)
    expect(document.cookie).toContain(`${GUEST_MODE_COOKIE}=true`)
  })

  it('setGuestMode(false) deletes the cookie', () => {
    const { result } = renderHook(() => useGuestMode())

    act(() => {
      result.current.setGuestMode(true)
    })
    expect(isGuestModeActive()).toBe(true)

    act(() => {
      result.current.setGuestMode(false)
    })

    expect(result.current.guestMode).toBe(false)
    expect(isGuestModeActive()).toBe(false)
  })

  it('clearGuestMode() is reflected across hook instances via the change event', () => {
    const { result: a } = renderHook(() => useGuestMode())
    const { result: b } = renderHook(() => useGuestMode())

    act(() => {
      a.current.setGuestMode(true)
    })
    expect(b.current.guestMode).toBe(true)

    act(() => {
      clearGuestMode()
    })

    expect(a.current.guestMode).toBe(false)
    expect(b.current.guestMode).toBe(false)
    expect(isGuestModeActive()).toBe(false)
  })
})

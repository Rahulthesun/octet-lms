import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  },
}))

import { useAdminOnlineClasses, type ScheduleClassInput } from '../useOnlineClasses'

// This suite never touches the network — `fetch` is stubbed below, so no
// call here can reach the real API or trigger a real email send regardless
// of the `sendNotification` flag's value.
describe('useAdminOnlineClasses', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-uuid' })
  })

  it('loads the class list on mount', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ classes: [{ id: 'c1', title: 'Kinetics Revision' }] }),
    })

    const { result } = renderHook(() => useAdminOnlineClasses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.classes).toEqual([{ id: 'c1', title: 'Kinetics Revision' }])
  })

  it('schedule() sends the sendNotification flag through untouched and prepends the new class', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ class: { id: 'c2', title: 'Test Batch Session' } }) }
      }
      return { ok: true, status: 200, json: async () => ({ classes: [] }) }
    })

    const { result } = renderHook(() => useAdminOnlineClasses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const input: ScheduleClassInput = {
      batchId: 'test-batch-1',
      title: 'Test Batch Session',
      date: '2026-01-01',
      startTime: '10:00',
      endTime: '11:00',
      sendNotification: true,
    }

    await act(async () => {
      await result.current.schedule(input)
    })

    const postCall = mockFetch.mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    const body = JSON.parse((postCall![1] as RequestInit).body as string)

    // The hook only serializes the request; it never performs the send
    // itself, so asserting the flag reached the payload is the full extent
    // of what this layer is responsible for.
    expect(body.sendNotification).toBe(true)
    expect(body.batchId).toBe('test-batch-1')
    expect(body.idempotencyKey).toBe('generated-uuid')

    expect(result.current.classes[0]).toEqual({ id: 'c2', title: 'Test Batch Session' })
  })

  it('generates an idempotency key only when one is not supplied', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, status: 200, json: async () => ({ class: {} }) }
      return { ok: true, status: 200, json: async () => ({ classes: [] }) }
    })

    const { result } = renderHook(() => useAdminOnlineClasses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.schedule({
        batchId: 'test-batch-1',
        title: 'X',
        date: '2026-01-01',
        startTime: '10:00',
        endTime: '11:00',
        idempotencyKey: 'caller-supplied-key',
      })
    })

    const postCall = mockFetch.mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    const body = JSON.parse((postCall![1] as RequestInit).body as string)
    expect(body.idempotencyKey).toBe('caller-supplied-key')
  })

  it('cancel() replaces the matching class in place', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if ((url as string).endsWith('/cancel')) {
        return { ok: true, status: 200, json: async () => ({ class: { id: 'c1', status: 'cancelled' } }) }
      }
      return { ok: true, status: 200, json: async () => ({ classes: [{ id: 'c1', status: 'scheduled' }] }) }
    })

    const { result } = renderHook(() => useAdminOnlineClasses())
    await waitFor(() => expect(result.current.classes).toHaveLength(1))

    await act(async () => {
      await result.current.cancel('c1')
    })

    expect(result.current.classes[0]).toEqual({ id: 'c1', status: 'cancelled' })
  })
})

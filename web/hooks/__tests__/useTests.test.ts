import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock the supabase client so getToken() never touches the network — auth
// state is fully controlled by the test.
vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  },
}))

import { useAdminTests, authedFetch, type CreateTestInput } from '../useTests'

describe('authedFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('attaches the bearer token and JSON content-type by default', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })

    await authedFetch('/api/tests')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tests'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('omits Content-Type for FormData bodies', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await authedFetch('/api/tests/1/question-file', { method: 'POST', body: new FormData() })

    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers
    expect(headers['Content-Type']).toBeUndefined()
  })

  it('throws with the server-provided message on a non-ok response', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Batch is required' }),
    })

    await expect(authedFetch('/api/tests', { method: 'POST', body: '{}' })).rejects.toThrow('Batch is required')
  })

  it('returns null for a 204 response without parsing a body', async () => {
    const json = vi.fn()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204, json })

    const result = await authedFetch('/api/tests/1', { method: 'DELETE' })

    expect(result).toBeNull()
    expect(json).not.toHaveBeenCalled()
  })
})

describe('useAdminTests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loads tests on mount and exposes them once resolved', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 't1', title: 'Unit Test MCQ' }],
    })

    const { result } = renderHook(() => useAdminTests())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.tests).toEqual([{ id: 't1', title: 'Unit Test MCQ' }])
    expect(result.current.error).toBeNull()
  })

  it('applies batchId and status as query params', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200, json: async () => [] })

    renderHook(() => useAdminTests({ batchId: 'test-batch-1', status: 'scheduled' }))

    await waitFor(() => {
      const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(url).toContain('batchId=test-batch-1')
      expect(url).toContain('status=scheduled')
    })
  })

  it('surfaces a fetch error via the error state instead of throwing', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    })

    const { result } = renderHook(() => useAdminTests())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Internal error')
    expect(result.current.tests).toEqual([])
  })

  it('createTest posts the payload and refetches the list', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ id: 't2', title: 'New Test' }) }
      }
      return { ok: true, status: 200, json: async () => [{ id: 't2', title: 'New Test' }] }
    })

    const { result } = renderHook(() => useAdminTests())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const input: CreateTestInput = {
      title: 'New Test',
      type: 'mcq',
      batchId: 'test-batch-1',
      scheduledStart: '2026-01-01T00:00:00.000Z',
      scheduledEnd: '2026-01-01T01:00:00.000Z',
    }

    let created
    await act(async () => {
      created = await result.current.createTest(input)
    })

    expect(created).toEqual({ id: 't2', title: 'New Test' })

    const postCall = mockFetch.mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toMatchObject({ batchId: 'test-batch-1' })

    await waitFor(() => expect(result.current.tests).toEqual([{ id: 't2', title: 'New Test' }]))
  })
})

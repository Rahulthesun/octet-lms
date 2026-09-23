import '@testing-library/jest-dom/vitest'

// Dummy values so lib/supabase/client.ts doesn't throw on import during tests.
// No test in this suite ever reaches a real Supabase project or the network —
// every hook that uses `supabase` mocks the module directly (see
// hooks/__tests__/*.test.ts). This is just to satisfy the non-null assertions
// at import time.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= 'test-anon-key'
process.env.NEXT_PUBLIC_SERVER_URL ||= 'http://test-api.local'

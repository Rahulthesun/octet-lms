// lib/apiClient.js

// A helper for making authenticated requests to our backend API, which also handles attaching the Supabase auth token and error handling.
import { supabase } from '@/lib/supabase/client';

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8000';

export const REVOKED_MESSAGE = 'Your access has been revoked because you graduated.';

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// A student whose graduation date has passed is rejected by the API with
// code ACCESS_REVOKED. Sign them out right away (their server-side sessions
// were already destroyed) and send them to the login page with the message.
async function handleRevoked() {
  try {
    await supabase.auth.signOut();
  } catch {
    // signing out is best-effort — the redirect below is what matters
  }
  if (typeof window !== 'undefined') {
    window.location.replace('/login?revoked=1');
  }
}

export async function authedFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 403 && errBody.code === 'ACCESS_REVOKED') {
      await handleRevoked();
    }
    // The API answers errors as { error: "..." } (some older routes use { message }).
    throw new ApiError(errBody.error || errBody.message || `Request failed: ${res.status}`, {
      status: res.status,
      code: errBody.code,
    });
  }

  return res.json();
}

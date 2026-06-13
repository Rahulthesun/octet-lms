// lib/apiClient.js

// A helper for making authenticated requests to our backend API, which also handles attaching the Supabase auth token and error handling.
import { supabase } from '@/lib/supabase/client';

const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8000';

export async function authedFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Request failed: ${res.status}`);
  }

  return res.json();
}
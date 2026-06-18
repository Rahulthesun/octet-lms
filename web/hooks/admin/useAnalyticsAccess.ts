'use client';

// frontend/hooks/useAnalyticsAccess.js
//
// Confirms the current session is authorized for /analytics before rendering it.
// The backend is the real gatekeeper — every /api/analytics/* route re-checks
// the role on every request via requireRole — this hook just avoids flashing
// dashboard content at someone who's about to get bounced, and gives the page
// a clean loading/denied state.
//
// Requires NEXT_PUBLIC_API_BASE_URL in your frontend .env.local, pointing at
// your Fly.io backend, e.g. https://your-app.fly.dev

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useAnalyticsAccess() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authorized' | 'denied'
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        if (isMounted) setStatus('denied');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/analytics/access-check`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (isMounted) setStatus('denied');
          return;
        }

        const json = await res.json();
        if (isMounted) {
          setUser(json.user);
          setStatus('authorized');
        }
      } catch (err) {
        console.error('Analytics access check failed:', err);
        if (isMounted) setStatus('denied');
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, []);

  return { status, user };
}
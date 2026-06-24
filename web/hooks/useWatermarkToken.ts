import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';

export function useWatermarkToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (!session?.access_token) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/watermark/token`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
        const data = await res.json();
        setToken(data.token ?? null);
      } catch {
        setToken(null);
      }
    })();
  }, []);

  return token;
}
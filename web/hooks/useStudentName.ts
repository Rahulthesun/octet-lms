import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';

// Module-level cache
let nameCache: string | null = null;

export function useStudentName(): string | null {
  const [name, setName] = useState<string | null>(nameCache);

  useEffect(() => {
    if (nameCache) {
      setName(nameCache);
      return;
    }

    const loadStudentName = async () => {
      try {
        const session = await getSession();

        if (!session?.user?.id) return;

        const response = await fetch(
          `/api/student/profile?studentId=${session.user.id}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch student profile');
        }

        const data = await response.json();

        const studentName = data.name ?? null;

        nameCache = studentName;
        setName(studentName);
      } catch (error) {
        console.error('Error loading student name:', error);
      }
    };

    loadStudentName();
  }, []);

  return name;
}

export function clearStudentNameCache() {
  nameCache = null;
}
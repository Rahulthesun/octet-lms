'use client'

import { useParams } from 'next/navigation'
import ScheduleTestForm from '@/components/admin/tests/ScheduleTestForm'

// Edit an existing test (any status) — batch, questions, timing, marks.
// Reuses the same form as "Schedule New Test", in edit mode (see
// components/admin/tests/ScheduleTestForm for the create/edit/draft-resume split).
export default function EditTestPage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  return <ScheduleTestForm testId={id} />
}

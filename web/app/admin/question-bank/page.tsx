'use client'

// Standalone Question Bank page: lists every group of bank questions (one per
// past test, or one per manually-added label) and lets an admin add new
// questions straight to the bank without creating a test.
//
// Reuses the same backend as the "Import from question bank" modal
// (QuestionBankModal.tsx, used from ScheduleTestForm.tsx) — that flow is left
// completely untouched by this page.

import { useCallback, useEffect, useRef, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'
import { imageFromClipboard, imageFromFiles, uploadQuestionImage } from '@/lib/questionImages'
import QuestionContent from '@/components/shared/QuestionContent'
import { Watermark, useExamGuard } from '@/components/shared/ExamSecurity'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { ContentType, OptionKey, QuestionContentFields } from '@/hooks/useTests'

const ACCENT = '#5B21B6'

interface BankGroup {
  sourceTestId: string | null
  title: string
  questionCount: number
  lastAdded: string
  testExists: boolean
  /** Chapter of the source test, when known — shown alongside the title so two
   *  different tests that happen to share the same title can be told apart. */
  chapter?: string | null
  /** True when another group (a different test) has the exact same displayed
   *  title — surfaced in the UI instead of silently merging them. */
  titleSharedWithOtherGroup?: boolean
}

interface BankQuestion extends QuestionContentFields {
  bankQuestionId: string
  correctOption: OptionKey
  marks: number
  questionImageKey?: string | null
  optionAImageKey?: string | null
  optionBImageKey?: string | null
  optionCImageKey?: string | null
  optionDImageKey?: string | null
  questionImageContentHash?: string | null
  optionAImageContentHash?: string | null
  optionBImageContentHash?: string | null
  optionCImageContentHash?: string | null
  optionDImageContentHash?: string | null
  questionImagePerceptualHash?: string | null
  optionAImagePerceptualHash?: string | null
  optionBImagePerceptualHash?: string | null
  optionCImagePerceptualHash?: string | null
  optionDImagePerceptualHash?: string | null
}

function groupQuery(g: BankGroup) {
  return g.sourceTestId ? `sourceTestId=${encodeURIComponent(g.sourceTestId)}` : `title=${encodeURIComponent(g.title)}`
}

function groupKey(g: BankGroup) {
  return g.sourceTestId ?? `title:${g.title}`
}

// ── Manual add form types ───────────────────────────────────────────────

type FieldKey = 'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD'

interface FieldValue {
  type: ContentType
  text: string
  imageKey: string | null
  previewUrl: string | null
  /** SHA-256 of the image bytes (for true duplicate detection server-side). */
  imageContentHash: string | null
  /** dHash perceptual hash of the image (for near-duplicate detection server-side). */
  imagePerceptualHash: string | null
}

interface DraftQuestion {
  question: FieldValue
  optionA: FieldValue
  optionB: FieldValue
  optionC: FieldValue
  optionD: FieldValue
  correctOption: OptionKey
  marks: number
  /** Set once this question has been autosaved to the bank — further edits PATCH it instead of creating a duplicate. */
  savedId?: string
  /** True when the last save attempt found this exact question already existed in the bank (byte-identical content) and skipped it. */
  isDuplicate?: boolean
}

function emptyField(): FieldValue {
  return { type: 'text', text: '', imageKey: null, previewUrl: null, imageContentHash: null, imagePerceptualHash: null }
}

function emptyDraft(): DraftQuestion {
  return {
    question: emptyField(),
    optionA: emptyField(),
    optionB: emptyField(),
    optionC: emptyField(),
    optionD: emptyField(),
    correctOption: 'a',
    marks: 1,
  }
}

function fieldHasContent(v: FieldValue) {
  return v.type === 'image' ? !!v.imageKey : v.text.trim().length > 0
}

/** Builds the API payload (questionType/questionText/... correctOption/marks) from one draft. Shared by add + edit. */
function draftToPayload(d: DraftQuestion) {
  return {
    questionType: d.question.type,
    questionText: d.question.type === 'text' ? d.question.text.trim() : null,
    questionImageKey: d.question.type === 'image' ? d.question.imageKey : null,
    questionImageContentHash: d.question.type === 'image' ? d.question.imageContentHash : null,
    questionImagePerceptualHash: d.question.type === 'image' ? d.question.imagePerceptualHash : null,
    optionAType: d.optionA.type,
    optionA: d.optionA.type === 'text' ? d.optionA.text.trim() : null,
    optionAImageKey: d.optionA.type === 'image' ? d.optionA.imageKey : null,
    optionAImageContentHash: d.optionA.type === 'image' ? d.optionA.imageContentHash : null,
    optionAImagePerceptualHash: d.optionA.type === 'image' ? d.optionA.imagePerceptualHash : null,
    optionBType: d.optionB.type,
    optionB: d.optionB.type === 'text' ? d.optionB.text.trim() : null,
    optionBImageKey: d.optionB.type === 'image' ? d.optionB.imageKey : null,
    optionBImageContentHash: d.optionB.type === 'image' ? d.optionB.imageContentHash : null,
    optionBImagePerceptualHash: d.optionB.type === 'image' ? d.optionB.imagePerceptualHash : null,
    optionCType: d.optionC.type,
    optionC: d.optionC.type === 'text' ? d.optionC.text.trim() : null,
    optionCImageKey: d.optionC.type === 'image' ? d.optionC.imageKey : null,
    optionCImageContentHash: d.optionC.type === 'image' ? d.optionC.imageContentHash : null,
    optionCImagePerceptualHash: d.optionC.type === 'image' ? d.optionC.imagePerceptualHash : null,
    optionDType: d.optionD.type,
    optionD: d.optionD.type === 'text' ? d.optionD.text.trim() : null,
    optionDImageKey: d.optionD.type === 'image' ? d.optionD.imageKey : null,
    optionDImageContentHash: d.optionD.type === 'image' ? d.optionD.imageContentHash : null,
    optionDImagePerceptualHash: d.optionD.type === 'image' ? d.optionD.imagePerceptualHash : null,
    correctOption: d.correctOption,
    marks: d.marks,
  }
}

/** The reverse: a bank question (as returned by the API) -> an editable draft. */
function bankQuestionToDraft(q: BankQuestion): DraftQuestion {
  function field(
    type: ContentType,
    text: string | null,
    imageUrl: string | null | undefined,
    imageKey: string | null | undefined,
    imageContentHash: string | null | undefined,
    imagePerceptualHash: string | null | undefined
  ): FieldValue {
    return {
      type,
      text: text ?? '',
      imageKey: imageKey ?? null,
      previewUrl: imageUrl ?? null,
      imageContentHash: imageContentHash ?? null,
      imagePerceptualHash: imagePerceptualHash ?? null,
    }
  }
  return {
    question: field(q.questionType, q.questionText, q.questionImageUrl, q.questionImageKey, q.questionImageContentHash, q.questionImagePerceptualHash),
    optionA: field(q.optionAType, q.optionA, q.optionAImageUrl, q.optionAImageKey, q.optionAImageContentHash, q.optionAImagePerceptualHash),
    optionB: field(q.optionBType, q.optionB, q.optionBImageUrl, q.optionBImageKey, q.optionBImageContentHash, q.optionBImagePerceptualHash),
    optionC: field(q.optionCType, q.optionC, q.optionCImageUrl, q.optionCImageKey, q.optionCImageContentHash, q.optionCImagePerceptualHash),
    optionD: field(q.optionDType, q.optionD, q.optionDImageUrl, q.optionDImageKey, q.optionDImageContentHash, q.optionDImagePerceptualHash),
    correctOption: q.correctOption,
    marks: q.marks,
  }
}

function validateDraft(draft: DraftQuestion): string | null {
  const fields: FieldKey[] = ['question', 'optionA', 'optionB', 'optionC', 'optionD']
  for (const f of fields) {
    if (!fieldHasContent(draft[f])) return `${FIELD_LABELS[f]} needs text or an image`
  }
  return null
}

const FIELD_LABELS: Record<FieldKey, string> = {
  question: 'Question',
  optionA: 'Option A',
  optionB: 'Option B',
  optionC: 'Option C',
  optionD: 'Option D',
}

function FieldEditor({ label, value, onChange }: { label: string; value: FieldValue; onChange: (v: FieldValue) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef(false)
  const takeImageRef = useRef<(file: File | null) => void>(() => {})

  // Same Ctrl+V-to-upload pattern as QuestionFieldInput.tsx (test creation):
  // paste works while the pointer hovers the image zone OR it has focus, so
  // a screenshot can be pasted without clicking first. Only handles a
  // clipboard that actually holds an image.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const zone = zoneRef.current
      if (!zone) return
      const focused = zone.contains(document.activeElement)
      if (!hoveredRef.current && !focused) return
      const file = imageFromClipboard(e)
      if (!file) return
      e.preventDefault()
      takeImageRef.current(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  async function handleFile(file: File | null) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadQuestionImage(file)
      onChange({ ...value, imageKey: uploaded.key, previewUrl: uploaded.previewUrl, imageContentHash: uploaded.contentHash, imagePerceptualHash: uploaded.perceptualHash })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  takeImageRef.current = handleFile

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <div className="flex gap-1 text-xs">
          <button type="button"
            onClick={() => onChange({ ...value, type: 'text' })}
            className={`px-2 py-1 rounded-md border ${value.type === 'text' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}>
            Text
          </button>
          <button type="button"
            onClick={() => onChange({ ...value, type: 'image' })}
            className={`px-2 py-1 rounded-md border ${value.type === 'image' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}>
            Image
          </button>
        </div>
      </div>
      {value.type === 'text' ? (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          rows={2}
          className="w-full text-sm rounded-lg px-3 py-2 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          placeholder={`${label} text`}
        />
      ) : (
        <div
          ref={zoneRef}
          onMouseEnter={() => { hoveredRef.current = true }}
          onMouseLeave={() => { hoveredRef.current = false }}
          tabIndex={0}
          role="group"
          aria-label={`${label} image. Focus here and press Control V to paste a screenshot`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(imageFromFiles(e.dataTransfer.files))
          }}
          className={`space-y-2 rounded-lg border-2 border-dashed p-2 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-200 ${
            dragOver ? 'border-violet-500 bg-violet-50' : 'border-zinc-300'
          }`}
        >
          {value.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.previewUrl} alt={label} className="max-h-32 rounded-lg border border-zinc-200" />
          )}
          <p className="text-xs text-zinc-500">Hover and press Ctrl+V to paste a screenshot, drag and drop an image, or choose a file below</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = '' }}
            className="block w-full text-sm text-zinc-600"
          />
          {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function QuestionForm({ draft, index, onChange, onRemove, removable }: {
  draft: DraftQuestion
  index: number
  onChange: (d: DraftQuestion) => void
  onRemove: () => void
  removable: boolean
}) {
  function setField(key: FieldKey, v: FieldValue) {
    onChange({ ...draft, [key]: v })
  }
  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-700">Question {index + 1}</p>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs text-rose-600 hover:underline">Remove</button>
        )}
      </div>
      <FieldEditor label={FIELD_LABELS.question} value={draft.question} onChange={(v) => setField('question', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key) => (
          <FieldEditor key={key} label={FIELD_LABELS[key]} value={draft[key]} onChange={(v) => setField(key, v)} />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-700">Correct option</span>
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" name={`correct-${index}`} checked={draft.correctOption === k}
                onChange={() => onChange({ ...draft, correctOption: k })} className="accent-violet-600" />
              {k.toUpperCase()}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-700">Marks</span>
          <input type="number" min={1} value={draft.marks}
            onChange={(e) => onChange({ ...draft, marks: Number(e.target.value) || 1 })}
            className="w-20 text-sm rounded-lg px-2 py-1.5 border border-zinc-300" />
        </div>
      </div>
    </div>
  )
}

/**
 * Add questions to the bank — with per-question autosave. Each question
 * that becomes complete (all 5 fields + a label present) is silently saved
 * to the bank ~1.2s after the last edit, so closing the tab, losing the
 * connection, or navigating away never loses a finished question — only an
 * incomplete field goes unsaved, the same guarantee as test-creation
 * autosave. Once a question has been saved once, further edits PATCH that
 * same bank row instead of creating a duplicate.
 */
function AddQuestionsModal({ initialLabel, sourceTestId, onClose, onSaved }: {
  initialLabel?: string
  sourceTestId?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const labelLocked = !!initialLabel
  const [label, setLabel] = useState(initialLabel ?? '')
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyDraft()])
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const savingRef = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateDraft(i: number, d: DraftQuestion) {
    // Editing an already-saved question clears its savedId's "up to date"
    // state implicitly — the next autosave tick will PATCH it with the new content.
    setDrafts((prev) => prev.map((p, idx) => (idx === i ? d : p)))
  }

  function addAnother() {
    setDrafts((prev) => [...prev, emptyDraft()])
  }

  function removeDraft(i: number) {
    // An already-autosaved question stays safely in the bank even if removed
    // from this form — there is no "undo the save" here, only "stop editing it here".
    setDrafts((prev) => prev.filter((_, idx) => idx !== i))
  }

  // ─── Per-question autosave ───
  useEffect(() => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      if (savingRef.current) return
      const toSave = drafts
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => validateDraft(d) === null)
      if (toSave.length === 0) return

      savingRef.current = true
      setSaveState('saving')
      try {
        for (const { d, i } of toSave) {
          if (!d.savedId) {
            const result: { ids?: string[]; added?: number } = await authedFetch('/api/question-bank/manual', {
              method: 'POST',
              body: JSON.stringify({ label: trimmedLabel, questions: [draftToPayload(d)], sourceTestId: sourceTestId || undefined }),
            })
            const newId = result.ids?.[0]
            const duplicate = (result.added ?? 0) === 0
            setDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, savedId: newId ?? p.savedId, isDuplicate: duplicate } : p)))
          } else {
            await authedFetch(`/api/question-bank/${d.savedId}`, {
              method: 'PATCH',
              body: JSON.stringify(draftToPayload(d)),
            })
          }
        }
        setSaveState('saved')
        onSaved()
      } catch {
        setSaveState('error')
      } finally {
        savingRef.current = false
      }
    }, 1200)

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, drafts])

  function validate(): string | null {
    if (!label.trim()) return 'A label for this group is required'
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      const fields: FieldKey[] = ['question', 'optionA', 'optionB', 'optionC', 'optionD']
      for (const f of fields) {
        if (!fieldHasContent(d[f])) return `Question ${i + 1}: ${FIELD_LABELS[f]} needs text or an image`
      }
    }
    return null
  }

  async function handleDone() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    // Everything complete is already autosaved by this point — this just
    // confirms and closes. Flush any not-yet-saved/edited question first.
    setError(null)
    setSaveState('saving')
    try {
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i]
        if (!d.savedId) {
          const result: { ids?: string[] } = await authedFetch('/api/question-bank/manual', {
            method: 'POST',
            body: JSON.stringify({ label: label.trim(), questions: [draftToPayload(d)], sourceTestId: sourceTestId || undefined }),
          })
          void result
        } else {
          await authedFetch(`/api/question-bank/${d.savedId}`, {
            method: 'PATCH',
            body: JSON.stringify(draftToPayload(d)),
          })
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaveState('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="bg-white w-full sm:w-[92vw] sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {labelLocked ? `Add questions to "${initialLabel}"` : 'Add questions to the bank'}
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-2">
              {labelLocked ? 'Appended to this existing group.' : 'Not tied to any test. Give this group a label.'}
              <span className={
                saveState === 'saving' ? 'text-amber-600' :
                saveState === 'saved' ? 'text-emerald-600' :
                saveState === 'error' ? 'text-rose-600' : 'text-zinc-400'
              }>
                {saveState === 'saving' ? '• Saving…' : saveState === 'saved' ? '• Saved' : saveState === 'error' ? '• Save failed, retrying…' : ''}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={labelLocked}
              placeholder="e.g. Organic Chemistry — Chapter 4"
              className="w-full text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </div>

          <div className="space-y-4">
            {drafts.map((d, i) => (
              <div key={i} className="relative">
                {d.savedId && d.isDuplicate && (
                  <span className="absolute -top-2 right-3 z-10 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Already in the bank — not added again
                  </span>
                )}
                {d.savedId && !d.isDuplicate && (
                  <span className="absolute -top-2 right-3 z-10 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Saved
                  </span>
                )}
                <QuestionForm draft={d} index={i}
                  onChange={(nd) => updateDraft(i, nd)}
                  onRemove={() => removeDraft(i)}
                  removable={drafts.length > 1}
                />
              </div>
            ))}
          </div>

          <button type="button" onClick={addAnother} className="text-sm text-violet-700 hover:underline">
            + Add another question
          </button>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
            Close
          </button>
          <button onClick={handleDone}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/** Renames a manually-added group's label across every question in it. */
function RenameGroupModal({ group, onClose, onRenamed }: {
  group: BankGroup
  onClose: () => void
  onRenamed: () => void
}) {
  const [title, setTitle] = useState(group.title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) { setError('A label is required'); return }
    setSaving(true)
    setError(null)
    try {
      await authedFetch('/api/question-bank/groups/rename', {
        method: 'PATCH',
        body: JSON.stringify({ oldTitle: group.title, newTitle: trimmed }),
      })
      onRenamed()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="bg-white w-full sm:max-w-md shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900">Rename group</h3>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <label className="text-sm font-medium text-zinc-700 block mb-1.5">Label</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          />
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Edits a single existing bank question's content in place. This is a
 * separate copy-store — saving here only changes the question_bank row
 * itself and never touches any test that previously imported a copy of it.
 */
function EditQuestionModal({ question, onClose, onSaved }: {
  question: BankQuestion
  onClose: () => void
  onSaved: (updated: BankQuestion) => void
}) {
  const [draft, setDraft] = useState<DraftQuestion>(() => bankQuestionToDraft(question))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const err = validateDraft(draft)
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated: BankQuestion = await authedFetch(`/api/question-bank/${question.bankQuestionId}`, {
        method: 'PATCH',
        body: JSON.stringify(draftToPayload(draft)),
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="bg-white w-full sm:w-[92vw] sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Edit question</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              Changes only affect this bank question — any test that imported a copy of it keeps its own, unchanged version.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <QuestionForm draft={draft} index={0} onChange={setDraft} onRemove={() => {}} removable={false} />
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  // Same anti-copy/anti-screenshot deterrents used during a live exam:
  // right-click/copy/print/devtools shortcuts blocked, content blurred the
  // instant the tab loses focus (e.g. a screen-recorder switching away).
  const { blurred } = useExamGuard(true)
  const [groups, setGroups] = useState<BankGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addMoreTo, setAddMoreTo] = useState<BankGroup | null>(null)
  const [renaming, setRenaming] = useState<BankGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<BankGroup | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [openKey, setOpenKey] = useState<string | null>(null)
  const [openGroup, setOpenGroup] = useState<BankGroup | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = debounced ? `?search=${encodeURIComponent(debounced)}` : ''
      const data: BankGroup[] = await authedFetch(`/api/question-bank/groups${qs}`)
      setGroups([...data].sort((a, b) => new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the question bank')
    } finally {
      setLoading(false)
    }
  }, [debounced])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  async function toggleGroup(g: BankGroup) {
    const key = groupKey(g)
    if (openKey === key) {
      setOpenKey(null)
      setOpenGroup(null)
      return
    }
    setOpenKey(key)
    setOpenGroup(g)
    setQuestions([])
    setLoadingQuestions(true)
    try {
      setQuestions(await authedFetch(`/api/question-bank/questions?${groupQuery(g)}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function reloadOpenGroup() {
    if (!openGroup) return
    try {
      setQuestions(await authedFetch(`/api/question-bank/questions?${groupQuery(openGroup)}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    }
  }

  async function confirmDeleteGroup() {
    if (!deletingGroup) return
    setBusy(true)
    try {
      await authedFetch(`/api/question-bank/groups?${groupQuery(deletingGroup)}`, { method: 'DELETE' })
      if (openGroup && groupKey(openGroup) === groupKey(deletingGroup)) {
        setOpenKey(null)
        setOpenGroup(null)
        setQuestions([])
      }
      setDeletingGroup(null)
      loadGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete group')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteQuestion() {
    if (!deletingQuestionId) return
    setBusy(true)
    try {
      await authedFetch(`/api/question-bank/${deletingQuestionId}`, { method: 'DELETE' })
      setQuestions((prev) => prev.filter((q) => q.bankQuestionId !== deletingQuestionId))
      setDeletingQuestionId(null)
      loadGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete question')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`p-8 max-w-6xl mx-auto transition-[filter] duration-150 ${blurred ? 'blur-xl select-none' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Question Bank</h1>
          <p className="text-[15px] text-zinc-500 mt-1">Every question saved from past tests, plus any added here directly.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors w-fit"
          style={{ backgroundColor: ACCENT }}>
          <span className="text-lg leading-none">+</span>
          Add Questions
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label"
          className="w-full sm:max-w-sm text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      </div>

      {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 mb-4">{error}</div>}

      {loading ? (
        <SkeletonList count={5} />
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center bg-white border border-zinc-200 rounded-xl">
          {debounced ? 'No groups match your search.' : 'The question bank is empty. Questions are saved automatically when you schedule an MCQ test, or add them directly here.'}
        </p>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
          {groups.map((g) => {
            const key = groupKey(g)
            const isOpen = openKey === key
            return (
              <div key={key}>
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 cursor-pointer" onClick={() => toggleGroup(g)}>
                    <p className="text-[15px] text-zinc-900 truncate flex items-center gap-2">
                      {g.title}
                      {g.titleSharedWithOtherGroup && (
                        <span title="Another group has this exact same title — these are different tests, told apart by chapter/date below."
                          className="text-xs font-normal px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          same title, different test
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {g.questionCount} question{g.questionCount === 1 ? '' : 's'}
                      {' · '}
                      {new Date(g.lastAdded).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}
                      {g.sourceTestId ? (g.testExists ? 'From an active test' : 'Test since deleted') : 'Added directly'}
                      {g.chapter && <> · {g.chapter}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!g.sourceTestId && (
                      <button onClick={() => setRenaming(g)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                        Rename
                      </button>
                    )}
                    <button onClick={() => setAddMoreTo(g)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                      + Add questions
                    </button>
                    <button onClick={() => setDeletingGroup(g)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50">
                      Delete
                    </button>
                    <button onClick={() => toggleGroup(g)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                      {isOpen ? 'Hide' : 'View questions'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3">
                    {loadingQuestions ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">Loading questions...</p>
                    ) : questions.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">No questions found.</p>
                    ) : (
                      questions.map((q, i) => (
                        <div key={q.bankQuestionId} className="relative overflow-hidden rounded-xl border border-zinc-200 p-4">
                          <Watermark lines={['OCTET']} />
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="text-[15px] text-zinc-900 flex-1">
                              <span className="text-zinc-400 mr-1">{i + 1}.</span>
                              <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingQuestion(q)}
                                className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingQuestionId(q.bankQuestionId)}
                                className="text-xs px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                            {(['a', 'b', 'c', 'd'] as const).map((k) => {
                              const field = `option${k.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                              return (
                                <div key={k} className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-md border ${
                                  q.correctOption === k ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-600'
                                }`}>
                                  <span className="font-semibold shrink-0">{k.toUpperCase()}.</span>
                                  <QuestionContent q={q} field={field} alt={`Option ${k.toUpperCase()}`} />
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">{q.marks} mark{q.marks === 1 ? '' : 's'}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddQuestionsModal onClose={() => setShowAdd(false)} onSaved={loadGroups} />
      )}

      {addMoreTo && (
        <AddQuestionsModal
          initialLabel={addMoreTo.title}
          sourceTestId={addMoreTo.sourceTestId}
          onClose={() => setAddMoreTo(null)}
          onSaved={() => { loadGroups(); if (openGroup && groupKey(openGroup) === groupKey(addMoreTo)) reloadOpenGroup() }}
        />
      )}

      {renaming && (
        <RenameGroupModal group={renaming} onClose={() => setRenaming(null)} onRenamed={loadGroups} />
      )}

      {deletingGroup && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeletingGroup(null)}>
          <div className="bg-white w-full sm:max-w-md shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Delete this group?</h3>
            </div>
            <div className="px-6 py-5 text-sm text-zinc-600 space-y-2">
              <p>
                This deletes all {deletingGroup.questionCount} question{deletingGroup.questionCount === 1 ? '' : 's'} in
                {' '}&quot;{deletingGroup.title}&quot; from the bank. This cannot be undone.
              </p>
              {deletingGroup.sourceTestId && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This only removes the bank copies — the live test and its own questions are not affected.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
              <button onClick={() => setDeletingGroup(null)} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
                Cancel
              </button>
              <button onClick={confirmDeleteGroup} disabled={busy}
                className="px-5 py-2.5 rounded-lg bg-rose-600 text-white text-[15px] disabled:opacity-50 hover:bg-rose-700">
                {busy ? 'Deleting...' : 'Delete group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingQuestionId && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeletingQuestionId(null)}>
          <div className="bg-white w-full sm:max-w-sm shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Delete this question?</h3>
            </div>
            <div className="px-6 py-5 text-sm text-zinc-600">This cannot be undone.</div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
              <button onClick={() => setDeletingQuestionId(null)} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
                Cancel
              </button>
              <button onClick={confirmDeleteQuestion} disabled={busy}
                className="px-5 py-2.5 rounded-lg bg-rose-600 text-white text-[15px] disabled:opacity-50 hover:bg-rose-700">
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(updated) => {
            setQuestions((prev) => prev.map((q) => (q.bankQuestionId === updated.bankQuestionId ? updated : q)))
          }}
        />
      )}
    </div>
  )
}

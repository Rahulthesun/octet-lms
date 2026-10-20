'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { authedFetch } from '@/lib/apiClient'
import { uploadQuestionImage, imageFromClipboard } from '@/lib/questionImages'
import QuestionContent from '@/components/shared/QuestionContent'
import { Watermark } from '@/components/shared/ExamSecurity'
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/16/solid'
import type { OptionKey } from '@/hooks/useTests'
import Select from '@/components/ui/Select'

const ACCENT = '#5B21B6'

export type Category = 'qa' | 'practice'

interface UnitItem {
  id: string
  name: string
  subjectId: string
  subtopicId: string
  grade: number
  category: Category
  mcqCount: number
  descriptiveCount: number
  resourcesCount: number
  totalQuestions: number
}

interface QuestionFieldState {
  type: 'text' | 'image'
  text: string
  imageKey: string | null
  imageUrl: string | null
  imageContentHash?: string | null
  imagePerceptualHash?: string | null
}

const emptyField = (): QuestionFieldState => ({
  type: 'text',
  text: '',
  imageKey: null,
  imageUrl: null,
})

// Single field editor supporting Text typing and Clipboard Image pasting (Ctrl+V)
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: QuestionFieldState
  onChange: (val: QuestionFieldState) => void
  placeholder?: string
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = imageFromClipboard(e)
    if (!file) return
    e.preventDefault()
    setUploading(true)
    try {
      const up = await uploadQuestionImage(file)
      onChange({
        type: 'image',
        text: '',
        imageKey: up.key,
        imageUrl: up.previewUrl,
        imageContentHash: up.contentHash,
        imagePerceptualHash: up.perceptualHash,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const up = await uploadQuestionImage(file)
      onChange({
        type: 'image',
        text: '',
        imageKey: up.key,
        imageUrl: up.previewUrl,
        imageContentHash: up.contentHash,
        imagePerceptualHash: up.perceptualHash,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5" onPaste={handlePaste}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {value.type === 'image' ? (
            <button
              type="button"
              onClick={() => onChange(emptyField())}
              className="text-xs text-rose-600 hover:underline cursor-pointer"
            >
              Clear Image
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-violet-700 hover:underline cursor-pointer"
            >
              Upload / Paste Image (Ctrl+V)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {uploading && (
        <div className="p-3 bg-violet-50 text-violet-700 text-xs rounded-xl flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          Uploading image from clipboard…
        </div>
      )}

      {value.type === 'image' && value.imageUrl ? (
        <div className="relative border border-zinc-200 rounded-xl p-2 bg-zinc-50 flex items-center justify-center min-h-[90px]">
          <img
            src={value.imageUrl}
            alt={label}
            className="max-h-48 object-contain rounded-lg"
          />
        </div>
      ) : (
        <textarea
          rows={label.toLowerCase().includes('option') ? 2 : 3}
          value={value.text}
          onChange={(e) => onChange({ ...value, type: 'text', text: e.target.value })}
          placeholder={placeholder || `Type text or press Ctrl+V to paste an image screenshot…`}
          className="w-full text-sm rounded-xl p-3 border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 resize-none transition-all"
        />
      )}
    </div>
  )
}

export function QaCategorySection({
  category,
  title,
  activeGrade = 12,
  embedded = false,
  selectedUnitId = null,
  onSelectUnit,
}: {
  category: Category
  title: string
  activeGrade?: 11 | 12
  embedded?: boolean
  /** Controlled from the parent page (app/admin/content/page.tsx) so the
   * selected unit's questions render in the big right panel, same as a
   * real notes chapter's files — not squeezed inline into this narrow
   * left-rail column. */
  selectedUnitId?: string | null
  onSelectUnit?: (unit: UnitItem | null) => void
}) {
  const [units, setUnits] = useState<UnitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add unit state
  const [newUnitName, setNewUnitName] = useState('')
  const [addingUnit, setAddingUnit] = useState(false)
  const [showAddUnitInput, setShowAddUnitInput] = useState(false)

  // Rename unit state
  const [renamingUnitId, setRenamingUnitId] = useState<string | null>(null)
  const [renameUnitValue, setRenameUnitValue] = useState('')

  // Load units for the active grade
  const loadUnits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: UnitItem[] = await authedFetch(
        `/api/qa-content/units?category=${category}&grade=${activeGrade}`
      )
      setUnits(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load units')
    } finally {
      setLoading(false)
    }
  }, [category, activeGrade])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  const handleSelectUnit = (unit: UnitItem) => {
    onSelectUnit?.(selectedUnitId === unit.id ? null : unit)
  }

  // Create Unit
  const handleAddUnit = async () => {
    const name = newUnitName.trim()
    if (!name) return
    setAddingUnit(true)
    setError(null)
    try {
      const res = await authedFetch('/api/qa-content/units', {
        method: 'POST',
        body: JSON.stringify({ category, grade: activeGrade, name }),
      })
      setNewUnitName('')
      setShowAddUnitInput(false)
      await loadUnits()
      if (res?.id) {
        onSelectUnit?.({
          id: res.id,
          name,
          subjectId: res.subjectId ?? '',
          subtopicId: res.subtopicId ?? '',
          grade: activeGrade,
          category,
          mcqCount: 0,
          descriptiveCount: 0,
          resourcesCount: 0,
          totalQuestions: 0,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add unit')
    } finally {
      setAddingUnit(false)
    }
  }

  // Rename Unit
  const handleRenameUnit = async (unitId: string) => {
    const name = renameUnitValue.trim()
    if (!name) return
    try {
      await authedFetch(`/api/qa-content/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      setRenamingUnitId(null)
      loadUnits()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename unit')
    }
  }

  // Delete Unit
  const handleDeleteUnit = async (unitId: string, name: string) => {
    if (!confirm(`Delete unit "${name}" and all its questions?`)) return
    try {
      await authedFetch(`/api/qa-content/units/${unitId}`, { method: 'DELETE' })
      if (selectedUnitId === unitId) onSelectUnit?.(null)
      loadUnits()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete unit')
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {/* Units List (designed like Exam Eve Study Material) */}
      <div className="space-y-1.5">
        {loading ? (
          <p className="text-xs text-zinc-400 py-3 pl-4">Loading units…</p>
        ) : units.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 pl-4">
            No units yet in Class {activeGrade}. Click &quot;+ Add Unit&quot; below.
          </p>
        ) : (
          units.map((unit, idx) => {
            const isSelected = selectedUnitId === unit.id
            const isRenaming = renamingUnitId === unit.id

            return (
              <div key={unit.id} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 transition-colors ${
                    isSelected ? 'bg-violet-50/60' : 'hover:bg-zinc-50'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={renameUnitValue}
                        onChange={(e) => setRenameUnitValue(e.target.value)}
                        className="text-xs rounded-lg px-2.5 py-1.5 border border-violet-400 flex-1 outline-none"
                      />
                      <button
                        onClick={() => handleRenameUnit(unit.id)}
                        className="p-1 rounded bg-violet-600 text-white cursor-pointer"
                        title="Save"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingUnitId(null)}
                        className="p-1 rounded border border-zinc-200 text-zinc-500 cursor-pointer"
                        title="Cancel"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectUnit(unit)}
                        className="flex-1 flex items-center justify-between text-left cursor-pointer"
                      >
                        <span className="text-sm font-medium text-zinc-800">
                          Unit - {idx + 1} {unit.name}
                        </span>
                        <span className="text-xs font-data text-zinc-400">
                          {unit.totalQuestions} question{unit.totalQuestions !== 1 ? 's' : ''}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setRenamingUnitId(unit.id)
                          setRenameUnitValue(unit.name)
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        title="Rename Unit"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit.id, unit.name)}
                        className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Unit"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>

      {/* Add Unit Inline Form (renamed from "Add subject") */}
      <div className="pt-1">
        {showAddUnitInput ? (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
            <input
              autoFocus
              type="text"
              placeholder="New unit name…"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddUnit()
                if (e.key === 'Escape') setShowAddUnitInput(false)
              }}
              className="text-xs rounded-lg px-3 py-1.5 border border-zinc-300 bg-white flex-1 outline-none focus:border-violet-500"
            />
            <button
              onClick={handleAddUnit}
              disabled={addingUnit || !newUnitName.trim()}
              className="text-xs px-3.5 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: ACCENT }}
            >
              {addingUnit ? 'Adding…' : '+ Add Unit'}
            </button>
            <button
              onClick={() => {
                setShowAddUnitInput(false)
                setNewUnitName('')
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddUnitInput(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-violet-700 bg-violet-50/70 border border-dashed border-violet-200 rounded-xl hover:bg-violet-100/60 transition-colors cursor-pointer"
          >
            + Add Unit
          </button>
        )}
      </div>
    </div>
  )
}
export default QaCategorySection

// ─── Right-panel question editor for a selected Unit ───────────────────────
//
// Rendered by app/admin/content/page.tsx in the SAME right-panel slot used
// for "Upload PDF or PPTX to <Chapter>" — same breadcrumb row, same white
// rounded-2xl card chrome, same generous width — instead of being squeezed
// into the 45%-wide left rail. Self-contained: fetches its own unit content
// independently of QaCategorySection's unit list.

export interface SelectedQaUnit {
  id: string
  name: string
  category: Category
  categoryTitle: string
}

export function QaUnitContentPanel({ unit, onClose }: { unit: SelectedQaUnit; onClose: () => void }) {
  const [unitContent, setUnitContent] = useState<{
    unit: any
    subtopicId: string
    mcqs: any[]
    descriptive: any[]
  } | null>(null)
  const [loadingContent, setLoadingContent] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [questionMode, setQuestionMode] = useState<'none' | 'mcq' | 'descriptive'>('none')
  const [savingQuestion, setSavingQuestion] = useState(false)

  const [mcqQuestion, setMcqQuestion] = useState(emptyField())
  const [mcqOptionA, setMcqOptionA] = useState(emptyField())
  const [mcqOptionB, setMcqOptionB] = useState(emptyField())
  const [mcqOptionC, setMcqOptionC] = useState(emptyField())
  const [mcqOptionD, setMcqOptionD] = useState(emptyField())
  const [mcqCorrect, setMcqCorrect] = useState<OptionKey>('a')
  const [mcqMarks, setMcqMarks] = useState<number>(1)

  const [descQuestion, setDescQuestion] = useState(emptyField())
  const [descAnswer, setDescAnswer] = useState(emptyField())
  const [descMarks, setDescMarks] = useState<number>(2)

  const [editingMcqId, setEditingMcqId] = useState<string | null>(null)
  const [editingDescId, setEditingDescId] = useState<string | null>(null)

  const loadUnitContent = useCallback(async () => {
    setLoadingContent(true)
    setError(null)
    try {
      const data = await authedFetch(`/api/qa-content/units/${unit.id}/content`)
      setUnitContent(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load unit questions')
    } finally {
      setLoadingContent(false)
    }
  }, [unit.id])

  useEffect(() => {
    loadUnitContent()
    setQuestionMode('none')
    setEditingMcqId(null)
    setEditingDescId(null)
  }, [loadUnitContent])

  function resetMcqDraft() {
    setEditingMcqId(null)
    setMcqQuestion(emptyField())
    setMcqOptionA(emptyField())
    setMcqOptionB(emptyField())
    setMcqOptionC(emptyField())
    setMcqOptionD(emptyField())
    setMcqCorrect('a')
    setMcqMarks(1)
  }

  function resetDescDraft() {
    setEditingDescId(null)
    setDescQuestion(emptyField())
    setDescAnswer(emptyField())
    setDescMarks(2)
  }

  const handleEditMcq = (q: any) => {
    setEditingMcqId(q.bankQuestionId || q.id)
    setQuestionMode('mcq')
    setMcqQuestion({ type: q.questionType || (q.questionImageUrl ? 'image' : 'text'), text: q.questionText || q.question || '', imageKey: q.questionImageKey || null, imageUrl: q.questionImageUrl || null })
    setMcqOptionA({ type: q.optionAType || (q.optionAImageUrl ? 'image' : 'text'), text: q.optionAText || q.optionA || '', imageKey: q.optionAImageKey || null, imageUrl: q.optionAImageUrl || null })
    setMcqOptionB({ type: q.optionBType || (q.optionBImageUrl ? 'image' : 'text'), text: q.optionBText || q.optionB || '', imageKey: q.optionBImageKey || null, imageUrl: q.optionBImageUrl || null })
    setMcqOptionC({ type: q.optionCType || (q.optionCImageUrl ? 'image' : 'text'), text: q.optionCText || q.optionC || '', imageKey: q.optionCImageKey || null, imageUrl: q.optionCImageUrl || null })
    setMcqOptionD({ type: q.optionDType || (q.optionDImageUrl ? 'image' : 'text'), text: q.optionDText || q.optionD || '', imageKey: q.optionDImageKey || null, imageUrl: q.optionDImageUrl || null })
    setMcqCorrect((q.correctOption || 'a') as OptionKey)
    setMcqMarks(q.marks || 1)
  }

  const handleEditDescriptive = (item: any) => {
    setEditingDescId(item.id)
    setQuestionMode('descriptive')
    setDescQuestion({ type: item.question?.type || (item.question?.imageUrl ? 'image' : 'text'), text: item.question?.text || '', imageKey: item.question?.imageKey || null, imageUrl: item.question?.imageUrl || null })
    setDescAnswer({ type: item.answer?.type || (item.answer?.imageUrl ? 'image' : 'text'), text: item.answer?.text || '', imageKey: item.answer?.imageKey || null, imageUrl: item.answer?.imageUrl || null })
    setDescMarks(item.marks || 2)
  }

  const handleSaveMcq = async () => {
    const hasQ = mcqQuestion.type === 'image' ? !!mcqQuestion.imageKey : !!mcqQuestion.text.trim()
    if (!hasQ) { alert('Please enter a question or upload/paste an image.'); return }
    setSavingQuestion(true)
    try {
      const payload = {
        questionType: mcqQuestion.type, question: mcqQuestion.text, questionImageKey: mcqQuestion.imageKey,
        questionImageContentHash: mcqQuestion.imageContentHash, questionImagePerceptualHash: mcqQuestion.imagePerceptualHash,
        optionAType: mcqOptionA.type, optionA: mcqOptionA.text, optionAImageKey: mcqOptionA.imageKey,
        optionBType: mcqOptionB.type, optionB: mcqOptionB.text, optionBImageKey: mcqOptionB.imageKey,
        optionCType: mcqOptionC.type, optionC: mcqOptionC.text, optionCImageKey: mcqOptionC.imageKey,
        optionDType: mcqOptionD.type, optionD: mcqOptionD.text, optionDImageKey: mcqOptionD.imageKey,
        correctOption: mcqCorrect, marks: mcqMarks,
      }
      if (editingMcqId) {
        await authedFetch(`/api/qa-content/questions/${editingMcqId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await authedFetch(`/api/qa-content/units/${unit.id}/mcq`, { method: 'POST', body: JSON.stringify(payload) })
      }
      resetMcqDraft()
      setQuestionMode('none')
      loadUnitContent()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save MCQ question')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleSaveDescriptive = async () => {
    const hasQ = descQuestion.type === 'image' ? !!descQuestion.imageKey : !!descQuestion.text.trim()
    if (!hasQ) { alert('Please enter a question or upload/paste an image.'); return }
    setSavingQuestion(true)
    try {
      const payload = {
        questionType: descQuestion.type, question: descQuestion.text, questionImageKey: descQuestion.imageKey,
        questionImageContentHash: descQuestion.imageContentHash, questionImagePerceptualHash: descQuestion.imagePerceptualHash,
        answerType: descAnswer.type, answer: descAnswer.text, answerImageKey: descAnswer.imageKey,
        answerImageContentHash: descAnswer.imageContentHash, answerImagePerceptualHash: descAnswer.imagePerceptualHash,
        marks: descMarks,
      }
      if (editingDescId) {
        await authedFetch(`/api/qa-content/descriptive/${editingDescId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await authedFetch(`/api/qa-content/units/${unit.id}/descriptive`, { method: 'POST', body: JSON.stringify(payload) })
      }
      resetDescDraft()
      setQuestionMode('none')
      loadUnitContent()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save descriptive item')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteMcq = async (id: string) => {
    if (!confirm('Delete this MCQ question?')) return
    try {
      await authedFetch(`/api/qa-content/questions/${id}`, { method: 'DELETE' })
      loadUnitContent()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete question')
    }
  }

  const handleDeleteDescriptive = async (id: string) => {
    if (!confirm('Delete this descriptive question?')) return
    try {
      await authedFetch(`/api/qa-content/descriptive/${id}`, { method: 'DELETE' })
      loadUnitContent()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete question')
    }
  }

  return (
    <div className="p-4">
      {/* Breadcrumb, matching the real notes panel's "> Subject > Chapter > Content Files" style */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
        <BreadcrumbChevron />
        <span>{unit.categoryTitle}</span>
        <BreadcrumbChevron />
        <span className="truncate max-w-40">{unit.name}</span>
        <BreadcrumbChevron />
        <span className="text-primary font-medium shrink-0">Questions</span>
        <button onClick={onClose} className="ml-auto text-xs text-zinc-400 hover:text-zinc-700">
          Close
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm px-4 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
      )}

      {/* Add-question card — same chrome as "Upload PDF or PPTX to <Chapter>" */}
      <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-medium text-gray-800">Add a question to {unit.name}</h2>
          <div className="inline-flex rounded-lg border border-zinc-300 overflow-hidden">
            <button
              type="button"
              onClick={() => { resetMcqDraft(); setQuestionMode('mcq') }}
              className={`px-4 py-1.5 text-sm font-medium ${questionMode === 'mcq' ? 'text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
              style={questionMode === 'mcq' ? { backgroundColor: ACCENT } : undefined}
            >
              MCQ
            </button>
            <button
              type="button"
              onClick={() => { resetDescDraft(); setQuestionMode('descriptive') }}
              className={`px-4 py-1.5 text-sm font-medium border-l border-zinc-300 ${questionMode === 'descriptive' ? 'text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
              style={questionMode === 'descriptive' ? { backgroundColor: ACCENT } : undefined}
            >
              Descriptive
            </button>
          </div>
        </div>

        {questionMode === 'mcq' && (
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <FieldInput label="Question" value={mcqQuestion} onChange={setMcqQuestion} placeholder="Type question or press Ctrl+V to paste screenshot…" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Option A" value={mcqOptionA} onChange={setMcqOptionA} />
              <FieldInput label="Option B" value={mcqOptionB} onChange={setMcqOptionB} />
              <FieldInput label="Option C" value={mcqOptionC} onChange={setMcqOptionC} />
              <FieldInput label="Option D" value={mcqOptionD} onChange={setMcqOptionD} />
            </div>
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-100 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-700">Correct option:</span>
                {(['a', 'b', 'c', 'd'] as OptionKey[]).map((opt) => (
                  <label key={opt} className={`text-sm font-bold px-3 py-1.5 rounded-lg uppercase cursor-pointer border transition-colors ${mcqCorrect === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
                    <input type="radio" name="mcqCorrect" checked={mcqCorrect === opt} onChange={() => setMcqCorrect(opt)} className="hidden" />
                    {opt}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600 font-medium">Marks:</span>
                <input type="number" min={1} max={10} value={mcqMarks} onChange={(e) => setMcqMarks(Number(e.target.value) || 1)} className="w-16 text-sm rounded-lg px-2 py-1.5 border border-zinc-200" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" onClick={() => { resetMcqDraft(); setQuestionMode('none') }} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancel</button>
                <button type="button" onClick={handleSaveMcq} disabled={savingQuestion} className="text-sm px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                  {savingQuestion ? 'Saving…' : editingMcqId ? 'Update MCQ' : 'Save Question'}
                </button>
              </div>
            </div>
          </div>
        )}

        {questionMode === 'descriptive' && (
          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <FieldInput label="Question" value={descQuestion} onChange={setDescQuestion} placeholder="Type descriptive question or press Ctrl+V to paste screenshot…" />
            <FieldInput label="Model Answer / Solution" value={descAnswer} onChange={setDescAnswer} placeholder="Type model answer or press Ctrl+V to paste solution image…" />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 flex-wrap">
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-sm text-zinc-600 font-medium">Marks:</span>
                <input type="number" min={1} max={50} value={descMarks} onChange={(e) => setDescMarks(Number(e.target.value) || 2)} className="w-16 text-sm rounded-lg px-2 py-1.5 border border-zinc-200" />
              </div>
              <button type="button" onClick={() => { resetDescDraft(); setQuestionMode('none') }} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancel</button>
              <button type="button" onClick={handleSaveDescriptive} disabled={savingQuestion} className="text-sm px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                {savingQuestion ? 'Saving…' : editingDescId ? 'Update' : 'Save Question'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions list */}
      <div className="bg-white shadow-sm p-4 rounded-2xl space-y-3">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          Questions in this unit {unitContent ? `(${unitContent.mcqs.length + unitContent.descriptive.length})` : ''}
        </h3>
        {loadingContent ? (
          <p className="text-sm text-zinc-400 py-6 text-center">Loading questions…</p>
        ) : !unitContent || (unitContent.mcqs.length === 0 && unitContent.descriptive.length === 0) ? (
          <div className="p-8 text-center text-sm text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            No questions in this unit yet. Use the MCQ / Descriptive tabs above to add some.
          </div>
        ) : (
          <div className="space-y-3">
            {unitContent.mcqs.map((q, i) => (
              <div key={q.bankQuestionId || i} className="relative overflow-hidden bg-white p-4 rounded-xl border border-zinc-200 space-y-2.5">
                <Watermark />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-800 flex-1">
                    <span className="text-zinc-400 mr-1.5">MCQ {i + 1}.</span>
                    <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400 font-data">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                    <button type="button" onClick={() => handleEditMcq(q)} className="text-zinc-400 hover:text-violet-700 p-1" title="Edit Question"><PencilIcon className="w-4 h-4" /></button>
                    <button type="button" onClick={() => handleDeleteMcq(q.bankQuestionId)} className="text-zinc-400 hover:text-rose-600 p-1" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {(['a', 'b', 'c', 'd'] as OptionKey[]).map((opt) => {
                    const field = `option${opt.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                    const isCorrect = q.correctOption === opt
                    return (
                      <div key={opt} className={`px-3 py-2 rounded-lg border text-sm flex items-start gap-2 ${isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' : 'border-zinc-200 text-zinc-600'}`}>
                        <span className="font-bold uppercase shrink-0">{opt}.</span>
                        <QuestionContent q={q} field={field} alt={`Option ${opt}`} />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {unitContent.descriptive.map((item, i) => (
              <div key={item.id || i} className="relative overflow-hidden bg-white p-4 rounded-xl border border-zinc-200 space-y-2.5">
                <Watermark />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-800 flex-1">
                    <span className="text-zinc-400 mr-1.5">Q{i + 1} (Descriptive).</span>
                    {item.question?.type === 'image' && item.question?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.question.imageUrl} alt="Question" className="max-h-40 object-contain rounded my-1" />
                    ) : (
                      <span>{item.question?.text}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-400 font-data">{item.marks} mark{item.marks === 1 ? '' : 's'}</span>
                    <button type="button" onClick={() => handleEditDescriptive(item)} className="text-zinc-400 hover:text-violet-700 p-1" title="Edit Question"><PencilIcon className="w-4 h-4" /></button>
                    <button type="button" onClick={() => handleDeleteDescriptive(item.id)} className="text-zinc-400 hover:text-rose-600 p-1" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                {item.answer && (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-sm text-emerald-900">
                    <span className="font-bold text-xs block text-emerald-800 mb-1 uppercase tracking-wide">Model Answer:</span>
                    {item.answer.type === 'image' && item.answer.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.answer.imageUrl} alt="Answer" className="max-h-40 object-contain rounded my-1" />
                    ) : (
                      <span>{item.answer.text}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BreadcrumbChevron() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 8 8" fill="none">
      <path d="M 2,1 L 6,4 L 2,7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

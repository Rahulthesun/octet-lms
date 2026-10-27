// Shared button class strings — every primary/secondary/"add" button in the
// admin and student portals uses one of these so they look identical.

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed'

/** Filled plum action button (Create, Save, Schedule, + Add …). */
export const btnPrimary = `${base} px-4 py-2 text-sm text-white bg-action hover:bg-action-dark`

/** White outlined button (View, Edit, Cancel …). */
export const btnSecondary = `${base} px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50`

/** Outlined destructive button (Delete, Remove …). */
export const btnDanger = `${base} px-4 py-2 text-sm text-rose-600 bg-white border border-rose-200 hover:bg-rose-50`

/** Compact versions for table rows and cards. */
export const btnPrimarySm = `${base} px-3 py-1.5 text-xs text-white bg-action hover:bg-action-dark`
export const btnSecondarySm = `${base} px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 hover:bg-gray-50`
export const btnDangerSm = `${base} px-3 py-1.5 text-xs text-rose-600 bg-white border border-rose-200 hover:bg-rose-50`

/** Full-width dashed "+ Add …" row used at the end of a list (Add Chapter, Add Unit …). */
export const btnAddRow =
  'w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-action rounded-lg border border-dashed border-violet-300 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400 transition-colors'

/** Small plus icon for "+ Add" buttons. */
export function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

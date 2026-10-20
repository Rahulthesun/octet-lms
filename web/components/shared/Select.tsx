// Thin re-export so the `shared/` import path used by this UI-polish sweep
// works without duplicating the implementation. The canonical Select
// component already lives at components/ui/Select.tsx (a real native
// <select> underneath -- kept for accessibility and the native mobile
// picker UI -- styled consistently with the rest of the app's inputs via
// `appearance-none` plus an absolutely-positioned chevron overlay; see that
// file for the full rationale). Keeping one implementation avoids two
// competing select components drifting apart over time.
export { Select, selectClasses, default } from '@/components/ui/Select'
export type { SelectProps } from '@/components/ui/Select'
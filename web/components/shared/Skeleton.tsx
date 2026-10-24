// Thin re-export so the `shared/` import path used by this mobile-polish
// sweep works without duplicating the implementation. The canonical
// Skeleton primitives (Skeleton, SkeletonText, SkeletonTable, SkeletonCard,
// SkeletonList, SkeletonRow) already live at components/ui/Skeleton.tsx and
// are used across the app -- keeping a single implementation avoids two
// competing skeleton systems drifting apart over time.
export { Skeleton, SkeletonText, SkeletonTable, SkeletonCard, SkeletonList, SkeletonRow, default } from '@/components/ui/Skeleton'
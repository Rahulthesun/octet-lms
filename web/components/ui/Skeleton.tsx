import React from 'react'

export function Skeleton({
  className = '',
  style,
  width,
  height,
}: {
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
}) {
  return (
    <div
      style={{ ...style, ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}) }}
      className={`animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 bg-[length:200%_100%] rounded-lg ${className}`}
    />
  )
}

// A single line of skeleton "text" -- convenience wrapper around Skeleton
// for the common case of faking a line of copy at a given width.
export function SkeletonText({
  className = '',
  width = '100%',
}: {
  className?: string
  width?: number | string
}) {
  return <Skeleton width={width} className={`h-4 ${className}`} />
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  columns,
}: {
  rows?: number
  cols?: number
  columns?: number
}) {
  const actualCols = columns ?? cols
  return (
    <div className="w-full bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
      <div className="p-4 bg-zinc-50 flex gap-4">
        {Array.from({ length: actualCols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex gap-4 items-center">
          {Array.from({ length: actualCols }).map((_, j) => (
            <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-1/3' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({
  count = 1,
  className = '',
}: {
  count?: number
  className?: string
}) {
  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className={`p-5 bg-white rounded-2xl border border-zinc-200 space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="pt-2 flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`p-5 bg-white rounded-2xl border border-zinc-200 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="pt-2 flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

// A single list row: label + sublabel on the left, an action-shaped block
// on the right. Factored out of SkeletonList so pages that build their own
// list wrapper (different spacing/border) can still reuse one row shape.
export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-white rounded-xl border border-zinc-200 flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
    </div>
  )
}

export default Skeleton

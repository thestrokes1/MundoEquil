import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Skeleton className="h-48 rounded-3xl bg-white/5" />
        </div>
        <Skeleton className="h-48 rounded-3xl bg-white/5" />
      </div>

      {/* Hourly row */}
      <Skeleton className="h-32 rounded-3xl bg-white/5" />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-3xl bg-white/5" />
        <Skeleton className="h-52 rounded-3xl bg-white/5" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-52 rounded-3xl bg-white/5" />
        <Skeleton className="h-52 rounded-3xl bg-white/5" />
        <Skeleton className="h-52 rounded-3xl bg-white/5" />
      </div>
    </div>
  )
}

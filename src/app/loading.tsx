import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Hero skeleton */}
      <div className="bg-surface-container-low py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <Skeleton className="h-4 w-24 mb-4 rounded-full" />
          <Skeleton className="h-10 w-2/3 mb-3 rounded-xl" />
          <Skeleton className="h-5 w-1/2 rounded-xl" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-3">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-5/6 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

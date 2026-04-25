/**
 * Skeleton loading components for Suspense fallbacks and loading states
 * Uses CSS animation for pulse effect — GPU-accelerated (only opacity + transform)
 */

/** Single skeleton line */
export function SkeletonLine({ className = '' }: { className?: string }) {
    return (
        <div
            className={`bg-[var(--color-muted)] rounded-full animate-pulse ${className}`}
            aria-hidden="true"
        />
    )
}

/** Restaurant card skeleton */
export function RestaurantCardSkeleton() {
    return (
        <div
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[20px] p-5 space-y-4 ios-shadow-sm"
            aria-hidden="true"
        >
            <div className="bg-[var(--color-muted)] rounded-[16px] h-44 animate-pulse" />
            <div className="space-y-3">
                <SkeletonLine className="h-6 w-3/4" />
                <SkeletonLine className="h-4 w-1/2" />
                <div className="flex gap-2 pt-1">
                    <SkeletonLine className="h-5 w-16" />
                    <SkeletonLine className="h-5 w-20" />
                </div>
            </div>
        </div>
    )
}

/** Restaurant list skeleton (grid) */
export function RestaurantListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <RestaurantCardSkeleton key={i} />
            ))}
        </div>
    )
}

/** Order item skeleton */
export function OrderItemSkeleton() {
    return (
        <div
            className="flex items-center gap-4 p-4 border-b border-[var(--color-border)] animate-pulse"
            aria-hidden="true"
        >
            <div className="bg-[var(--color-muted)] w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <SkeletonLine className="h-5 w-1/3" />
                <SkeletonLine className="h-4 w-1/2" />
            </div>
            <SkeletonLine className="h-5 w-20 shrink-0" />
        </div>
    )
}

/** Order list skeleton */
export function OrderListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="bg-[var(--color-card)] rounded-[20px] border border-[var(--color-border)] overflow-hidden">
            {Array.from({ length: count }).map((_, i) => (
                <OrderItemSkeleton key={i} />
            ))}
        </div>
    )
}

/** Menu item skeleton */
export function MenuItemSkeleton() {
    return (
        <div
            className="flex items-center gap-4 p-4 border-b border-[var(--color-border)] animate-pulse"
            aria-hidden="true"
        >
            <div className="flex-1 space-y-2">
                <SkeletonLine className="h-5 w-3/4" />
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-1/3" />
            </div>
            <div className="bg-[var(--color-muted)] w-20 h-20 rounded-[14px] shrink-0" />
        </div>
    )
}

/** Form skeleton */
export function FormSkeleton() {
    return (
        <div className="space-y-4 animate-pulse" aria-hidden="true">
            <div className="space-y-2">
                <SkeletonLine className="h-4 w-1/4" />
                <div className="bg-[var(--color-muted)] rounded-[16px] h-12 w-full" />
            </div>
            <div className="space-y-2">
                <SkeletonLine className="h-4 w-1/4" />
                <div className="bg-[var(--color-muted)] rounded-[16px] h-12 w-full" />
            </div>
            <div className="pt-4">
                <div className="bg-[var(--color-muted)] rounded-[16px] h-12 w-full" />
            </div>
        </div>
    )
}

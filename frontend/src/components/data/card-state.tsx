import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Every data card takes these and renders loading, error and empty states the same way. */
export interface CardStateProps {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Show the empty state; data cards also treat missing or zero-length data as empty. */
  empty?: boolean
  emptyTitle?: string
  emptyMessage?: string
}

interface CardStateViewProps extends CardStateProps {
  /** Height of the body area, so the card keeps its size across states. */
  minHeight?: number
  /** What to show while loading; defaults to one block filling the body. */
  skeleton?: ReactNode
  children: ReactNode
}

export function CardStateView({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'No data',
  emptyMessage = 'There is nothing to show for the current dataset.',
  minHeight = 200,
  skeleton,
  children,
}: CardStateViewProps) {
  if (loading) {
    return (
      <div aria-busy="true" style={{ minHeight }} className="flex flex-col">
        <span className="sr-only">Loading</span>
        {skeleton ?? <Skeleton className="flex-1" />}
      </div>
    )
  }
  if (error) {
    return (
      <StateMessage minHeight={minHeight} role="alert">
        <p className="text-sm font-medium text-negative">Could not load this</p>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </StateMessage>
    )
  }
  if (empty) {
    return (
      <StateMessage minHeight={minHeight}>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
      </StateMessage>
    )
  }
  return <>{children}</>
}

function StateMessage({
  minHeight,
  role,
  children,
}: {
  minHeight: number
  role?: 'alert'
  children: ReactNode
}) {
  return (
    <div
      role={role}
      style={{ minHeight }}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-subtle px-4 py-6 text-center',
      )}
    >
      {children}
    </div>
  )
}

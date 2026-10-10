import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { CardStateProps } from './card-state'
import { toneText, type Tone } from './tone'

export interface StatCardProps extends Omit<CardStateProps, 'emptyTitle'> {
  label: string
  value?: ReactNode
  caption?: string
  /** A short change label shown top-right, such as "+4.2%". Pair the tone with a sign so it is not color alone. */
  delta?: { label: string; tone: Tone }
  /** Color for the value itself, for figures that are inherently positive or negative. */
  tone?: Tone
}

export function StatCard({
  label,
  value,
  caption,
  delta,
  tone = 'neutral',
  loading,
  error,
  onRetry,
  empty,
  emptyMessage = 'No data yet',
}: StatCardProps) {
  const isEmpty = empty || value === undefined || value === null || value === ''
  return (
    <Card className="gap-0 px-5 py-5" aria-busy={loading || undefined}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {delta && !loading && !error && !isEmpty && (
          <span
            className={cn(
              'inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium tabular-nums',
              toneText[delta.tone],
            )}
          >
            {delta.label}
          </span>
        )}
      </div>
      {loading ? (
        <>
          <span className="sr-only">Loading</span>
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-3 h-4 w-40" />
        </>
      ) : error ? (
        <div role="alert">
          <p className="mt-2 text-3xl leading-9 font-semibold text-muted-foreground">-</p>
          <p className="mt-2 truncate text-sm text-negative" title={error}>
            {error}
          </p>
          {onRetry && (
            <Button variant="link" size="xs" className="h-auto px-0 text-brand" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : isEmpty ? (
        <>
          <p className="mt-2 text-3xl leading-9 font-semibold text-muted-foreground">-</p>
          <p className="mt-2 truncate text-sm text-muted-foreground">{emptyMessage}</p>
        </>
      ) : (
        <>
          <p className={cn('mt-2 truncate text-3xl leading-9 font-semibold tracking-tight tabular-nums', toneText[tone])}>
            {value}
          </p>
          {caption && <p className="mt-2 truncate text-sm text-muted-foreground" title={caption}>{caption}</p>}
        </>
      )}
    </Card>
  )
}

/** Four stat cards in a row on desktop, two on tablets, one on phones. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

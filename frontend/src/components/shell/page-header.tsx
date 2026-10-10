import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import type { DatasetSource } from '@/lib/api'
import { useDataset } from '@/lib/dataset'
import { formatNumber } from '@/lib/format'

const sourceLabel: Record<DatasetSource, string> = {
  csv: 'Bundled CSV',
  upload: 'Uploaded CSV',
  paste: 'Pasted text',
  scrape: 'Fetched from URL',
}

/** Page title with the current dataset underneath, and one primary action on the right. */
export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { current, loading, loadError } = useDataset()
  return (
    <header className="flex items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        <div className="mt-0.5 h-5 text-sm text-muted-foreground">
          {loading && !current ? (
            <Skeleton className="mt-1 h-3.5 w-56" />
          ) : current ? (
            <p className="truncate">
              <span className="text-foreground">{current.name}</span>
              <span className="tabular-nums"> · {formatNumber(current.review_count)} reviews</span>
              <span className="hidden sm:inline"> · {sourceLabel[current.source]}</span>
            </p>
          ) : (
            <p className="truncate">{loadError ? 'No dataset loaded' : ''}</p>
          )}
        </div>
      </div>
      {action}
    </header>
  )
}

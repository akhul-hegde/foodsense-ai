import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { colorOf, type Series, type ValueFormat } from './chart-theme'

interface TooltipEntry {
  name?: string | number
  value?: unknown
  color?: string
  dataKey?: unknown
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: readonly TooltipEntry[]
  format?: ValueFormat
}

/** Flat tooltip: category label, then one row per series with a swatch and a right-aligned value. */
export function ChartTooltip({ active, label, payload, format = formatNumber }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-md border bg-popover px-3 py-2 text-xs">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-1 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
              {typeof entry.value === 'number' ? format(entry.value) : String(entry.value ?? '')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Legend for two or more series; a single series is named by the card title instead. */
export function ChartLegend<T>({ series, className }: { series: Series<T>[]; className?: string }) {
  if (series.length < 2) return null
  return (
    <ul className={cn('mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}>
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-xs" style={{ background: colorOf(s, i) }} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** Loading placeholder shaped like a chart: gridlines and an axis row. */
export function ChartSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col justify-between gap-4 pt-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-px w-full" />
      ))}
      <Skeleton className="h-full min-h-16 w-full flex-1 opacity-60" />
      <div className="flex justify-between">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  )
}

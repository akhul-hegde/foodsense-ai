import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { toneDot, type Tone } from './tone'

/** A bordered pill with a tone dot; the text label carries the meaning, the dot only reinforces it. */
export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs whitespace-nowrap text-muted-foreground">
      <span aria-hidden className={cn('size-1.5 rounded-full', toneDot[tone])} />
      {children}
    </span>
  )
}

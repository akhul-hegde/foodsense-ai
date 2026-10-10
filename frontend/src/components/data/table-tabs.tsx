import type { ReactNode } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber } from '@/lib/format'

export interface TableTab<V extends string> {
  value: V
  label: string
  count?: number
}

interface TableTabsProps<V extends string> {
  tabs: TableTab<V>[]
  value: V
  onValueChange: (value: V) => void
  /** Controls shown at the right of the tab row. */
  actions?: ReactNode
  /** The table for the selected tab. */
  children: ReactNode
}

/** Tabs with count badges sitting above a table, as in a "view switcher" for one dataset. */
export function TableTabs<V extends string>({ tabs, value, onValueChange, actions, children }: TableTabsProps<V>) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as V)} className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto">
          <TabsList className="h-9">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-2.5 data-active:border-border"
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-foreground tabular-nums">
                    {formatNumber(tab.count)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Tabs>
  )
}

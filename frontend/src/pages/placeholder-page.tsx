import { DataCard } from '@/components/data'
import type { NavItem } from '@/lib/nav'

/** Stands in for a tab until its analysis view is built. */
export function PlaceholderPage({ item }: { item: NavItem }) {
  return (
    <DataCard
      title={item.label}
      subtitle={item.description}
      empty
      emptyTitle="Not built yet"
      emptyMessage={`The ${item.label} view will appear here.`}
      bodyHeight={280}
    >
      {null}
    </DataCard>
  )
}

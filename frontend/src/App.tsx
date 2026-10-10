import { lazy, Suspense } from 'react'

import { AppShell } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DatasetProvider, useDataset } from '@/lib/dataset'
import { findNavItem, type NavItem, type PageId } from '@/lib/nav'
import { useHashRoute } from '@/lib/use-hash-route'
import { OverviewPage } from '@/pages/overview-page'
import { PlaceholderPage } from '@/pages/placeholder-page'

// Development-only gallery of the shared components in every state, at #/preview.
const ComponentPreview = import.meta.env.DEV ? lazy(() => import('@/dev/component-preview')) : null

export default function App() {
  return (
    <DatasetProvider>
      <Routes />
    </DatasetProvider>
  )
}

function Page({ item }: { item: NavItem }) {
  return item.id === 'overview' ? <OverviewPage /> : <PlaceholderPage item={item} />
}

function Routes() {
  const [route, navigate] = useHashRoute()
  const { refresh, loading, pending } = useDataset()
  const preview = ComponentPreview !== null && route === 'preview'
  const item = findNavItem(route) ?? findNavItem('overview')!
  const active: PageId = preview ? 'overview' : item.id

  return (
    <AppShell
      active={active}
      onNavigate={navigate}
      title={preview ? 'Component preview' : item.label}
      action={
        <Button className="h-8 shrink-0 px-3" onClick={refresh} disabled={loading || pending !== null}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      }
    >
      {preview && ComponentPreview ? (
        <Suspense fallback={null}>
          <ComponentPreview />
        </Suspense>
      ) : (
        <Page key={item.id} item={item} />
      )}
    </AppShell>
  )
}

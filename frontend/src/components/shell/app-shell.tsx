import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { PageId } from '@/lib/nav'

import { DataSourceBar } from './data-source-bar'
import { PageHeader } from './page-header'
import { Sidebar } from './sidebar'

interface AppShellProps {
  active: PageId
  onNavigate: (id: PageId) => void
  title: string
  action?: ReactNode
  children: ReactNode
}

/**
 * Rounded outer container with a 240px sidebar. Below the md breakpoint the sidebar moves into a
 * sheet opened from a top bar. The main column scrolls on its own so the sidebar stays in view.
 */
export function AppShell({ active, onNavigate, title, action, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="h-dvh sm:p-3 lg:p-4">
      <div className="mx-auto flex h-full max-w-[1600px] overflow-hidden bg-background sm:rounded-lg sm:border">
        <aside className="hidden w-60 shrink-0 border-r bg-subtle md:flex">
          <Sidebar active={active} onNavigate={onNavigate} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden">
            <span className="text-base font-semibold tracking-tight">FoodSense AI</span>
            <Button variant="outline" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
              Menu
            </Button>
          </div>

          <DataSourceBar />
          <PageHeader title={title} action={action} />
          <main className="flex-1 px-4 pt-5 pb-8 sm:px-6 sm:pt-6">{children}</main>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-60 gap-0 bg-subtle p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            active={active}
            onNavigate={(id) => {
              onNavigate(id)
              setMenuOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

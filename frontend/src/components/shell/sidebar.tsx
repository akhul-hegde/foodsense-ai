import { footerNav, navGroups, type NavItem, type PageId } from '@/lib/nav'
import { cn } from '@/lib/utils'

interface SidebarProps {
  active: PageId
  onNavigate: (id: PageId) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-5">
        <span className="text-base font-semibold tracking-tight">FoodSense AI</span>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.id} item={item} active={item.id === active} onNavigate={onNavigate} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-auto space-y-0.5 pt-6">
          {footerNav.map((item) => (
            <NavLink key={item.id} item={item} active={item.id === active} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>
    </div>
  )
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: (id: PageId) => void }) {
  const Icon = item.icon
  return (
    <li>
      <a
        href={`#/${item.id}`}
        aria-current={active ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault()
          onNavigate(item.id)
        }}
        className={cn(
          'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          active ? 'bg-muted font-medium text-brand' : 'text-gray-700 hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.label}</span>
      </a>
    </li>
  )
}

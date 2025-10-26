import type { Panel } from '@shared/types'

interface MainLayoutProps {
  panel: Panel
}

export function MainLayout({ panel }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{panel.name}</h1>
            <p className="text-sm text-muted-foreground">
              {panel.total_positions} positions
            </p>
          </div>
          <div className="text-sm text-muted-foreground">Map My Panel</div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border bg-muted/30 p-4">
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Entities</h2>
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-muted">
                All
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-muted">
                By Room
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-muted">
                By Breaker
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-muted">
                Unmapped
              </button>
            </div>
          </div>
        </aside>

        {/* Main panel view */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="text-center text-muted-foreground py-12">
            <h2 className="text-2xl font-semibold mb-2">Panel View</h2>
            <p>Breaker panel visualization will appear here</p>
          </div>
        </main>
      </div>
    </div>
  )
}

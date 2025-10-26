import { useState } from 'react'
import type { Panel } from '@shared/types'
import { AllEntitiesView } from '../entities/AllEntitiesView'
import { ByRoomView } from '../entities/ByRoomView'
import { ByBreakerView } from '../entities/ByBreakerView'
import { UnmappedView } from '../entities/UnmappedView'
import { BreakerPanelGrid } from '../breaker-panel/BreakerPanelGrid'

interface MainLayoutProps {
  panel: Panel
}

type TabType = 'all' | 'room' | 'breaker' | 'unmapped'

export function MainLayout({ panel }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const tabs = [
    { id: 'all' as const, label: 'All' },
    { id: 'room' as const, label: 'By Room' },
    { id: 'breaker' as const, label: 'By Breaker' },
    { id: 'unmapped' as const, label: 'Unmapped' }
  ]

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
        <aside className="w-80 border-r border-border bg-muted/30 flex flex-col">
          {/* Tabs */}
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold mb-2">Entities</h2>
            <div className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity list */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'all' && <AllEntitiesView panelId={panel.id} />}
            {activeTab === 'room' && <ByRoomView panelId={panel.id} />}
            {activeTab === 'breaker' && <ByBreakerView panelId={panel.id} />}
            {activeTab === 'unmapped' && <UnmappedView panelId={panel.id} />}
          </div>
        </aside>

        {/* Main panel view */}
        <main className="flex-1 p-6 overflow-auto">
          <BreakerPanelGrid panel={panel} />
        </main>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import type { Panel } from '@shared/types'
import { ByRoomView } from '../entities/ByRoomView'
import { ByBreakerView } from '../entities/ByBreakerView'
import { BreakerPanelGrid } from '../breaker-panel/BreakerPanelGrid'
import { SettingsView } from '../settings/SettingsView'
import { AddEntityModal } from '../entities/AddEntityModal'
import { useEntities } from '../../hooks/useEntities'

interface MainLayoutProps {
  panel: Panel
  onPanelReset: () => void
}

type GroupingType = 'room' | 'breaker'

export function MainLayout({ panel, onPanelReset }: MainLayoutProps) {
  const [grouping, setGrouping] = useState<GroupingType>('room')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showAddEntityModal, setShowAddEntityModal] = useState(false)

  const groupingOptions = [
    { id: 'room' as const, label: 'By Room' },
    { id: 'breaker' as const, label: 'By Breaker' }
  ]

  const entityTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'outlet', label: 'Outlets' },
    { value: 'switch', label: 'Switches' },
    { value: 'light', label: 'Lights' },
    { value: 'appliance', label: 'Appliances' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'other', label: 'Other' }
  ]

  // Get all entities to extract unique rooms
  const { data: allEntities } = useEntities(panel.id)

  // Extract unique rooms from entities
  const availableRooms = useMemo(() => {
    if (!allEntities) return []
    const rooms = new Set(
      allEntities
        .map(e => e.room)
        .filter((room): room is string => room !== null && room.trim() !== '')
    )
    return Array.from(rooms).sort()
  }, [allEntities])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{showSettings ? 'Settings' : panel.name}</h1>
            {!showSettings && (
              <p className="text-sm text-muted-foreground">
                {panel.total_positions} positions
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Map My Panel</div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title={showSettings ? 'Back to Panel' : 'Settings'}
            >
              {showSettings ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {showSettings ? (
          /* Settings View - Full Width */
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <SettingsView panel={panel} onReset={onPanelReset} />
            </div>
          </div>
        ) : (
          <>
            {/* Sidebar */}
            <aside className="w-80 border-r border-border bg-muted/30 flex flex-col">
              {/* Grouping & Filters */}
              <div className="p-3 border-b border-border">
                {/* Grouping Tabs */}
                <div className="flex gap-1 mb-3">
                  {groupingOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setGrouping(option.id)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                        grouping === option.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Filters - Type and Room */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-xs"
                  >
                    {entityTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-xs"
                  >
                    <option value="all">All Rooms</option>
                    {availableRooms.map(room => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-auto p-4">
                {grouping === 'room' && <ByRoomView panelId={panel.id} typeFilter={entityTypeFilter} roomFilter={roomFilter} />}
                {grouping === 'breaker' && <ByBreakerView panelId={panel.id} typeFilter={entityTypeFilter} roomFilter={roomFilter} />}
              </div>

              {/* Sticky Add Entity Button */}
              <div className="p-4 border-t border-border bg-background">
                <button
                  onClick={() => setShowAddEntityModal(true)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium"
                >
                  + Add Entity
                </button>
              </div>
            </aside>

            {/* Main panel view */}
            <main className="flex-1 p-6 overflow-auto">
              <BreakerPanelGrid panel={panel} />
            </main>
          </>
        )}

      </div>

      {/* Add Entity Modal */}
      <AddEntityModal
        panelId={panel.id}
        isOpen={showAddEntityModal}
        onClose={() => setShowAddEntityModal(false)}
      />
    </div>
  )
}

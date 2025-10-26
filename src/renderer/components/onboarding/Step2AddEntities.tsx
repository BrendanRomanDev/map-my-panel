import { useState } from 'react'

interface Entity {
  name: string
  entity_type: 'outlet' | 'switch' | 'light' | 'appliance' | 'hvac' | 'other'
  room: string | null
  location: string | null
}

interface Step2AddEntitiesProps {
  rooms: string[]
  entities: Entity[]
  onUpdate: (entities: Entity[]) => void
  onNext: () => void
  onBack: () => void
}

export function Step2AddEntities({
  rooms,
  entities,
  onUpdate,
  onNext,
  onBack
}: Step2AddEntitiesProps) {
  const [name, setName] = useState('')
  const [entityType, setEntityType] = useState<Entity['entity_type']>('outlet')
  const [room, setRoom] = useState<string>('')
  const [location, setLocation] = useState('')

  const addEntity = () => {
    const trimmedName = name.trim()
    if (trimmedName) {
      const newEntity: Entity = {
        name: trimmedName,
        entity_type: entityType,
        room: room || null,
        location: location.trim() || null
      }
      onUpdate([...entities, newEntity])
      setName('')
      setLocation('')
    }
  }

  const removeEntity = (index: number) => {
    onUpdate(entities.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 2: Add Entities</h2>
      <p className="text-muted-foreground mb-6">
        Add outlets, switches, lights, and appliances. You'll map them to breakers later.
      </p>

      {/* Entity form */}
      <div className="space-y-4 mb-6 p-4 border border-border rounded-md bg-muted/50">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Kitchen Outlet 1"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value as Entity['entity_type'])}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="outlet">Outlet</option>
              <option value="switch">Switch</option>
              <option value="light">Light</option>
              <option value="appliance">Appliance</option>
              <option value="hvac">HVAC</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Room</label>
            <select
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="">No room</option>
              {rooms.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location (Optional)</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g., Near the refrigerator"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        <button
          onClick={addEntity}
          disabled={!name.trim()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Entity
        </button>
      </div>

      {/* Entity list */}
      {entities.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Entities ({entities.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entities.map((entity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-border rounded-md bg-background"
              >
                <div>
                  <div className="font-medium">{entity.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {entity.entity_type}
                    {entity.room && ` • ${entity.room}`}
                    {entity.location && ` • ${entity.location}`}
                  </div>
                </div>
                <button
                  onClick={() => removeEntity(index)}
                  className="text-destructive hover:text-destructive/90"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-border rounded-md hover:bg-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {entities.length > 0 ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  )
}

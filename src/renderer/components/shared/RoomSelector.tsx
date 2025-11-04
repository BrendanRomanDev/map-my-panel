import { useState, useEffect } from 'react'
import { useEntities } from '../../hooks/useEntities'

interface RoomSelectorProps {
  panelId: string
  value: string
  onChange: (room: string) => void
  placeholder?: string
}

export function RoomSelector({ panelId, value, onChange, placeholder = 'Select or add room' }: RoomSelectorProps) {
  const { data: entities } = useEntities(panelId)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

  // Get unique rooms from existing entities
  const existingRooms = Array.from(
    new Set(
      entities
        ?.map(e => e.room)
        .filter((room): room is string => room !== null && room.trim() !== '')
    )
  ).sort()

  // Check if current value is a custom room (not in existing list)
  useEffect(() => {
    if (value && !existingRooms.includes(value)) {
      setIsAddingNew(true)
      setNewRoomName(value)
    }
  }, [value, existingRooms])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value

    if (selectedValue === '__add_new__') {
      setIsAddingNew(true)
      setNewRoomName('')
      onChange('')
    } else {
      setIsAddingNew(false)
      onChange(selectedValue)
    }
  }

  const handleNewRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setNewRoomName(newValue)
    onChange(newValue)
  }

  const handleCancelNew = () => {
    setIsAddingNew(false)
    setNewRoomName('')
    onChange('')
  }

  if (isAddingNew) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoomName}
            onChange={handleNewRoomChange}
            placeholder="Enter room name"
            autoFocus
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleCancelNew}
            className="px-3 py-2 border border-border rounded-md hover:bg-muted text-sm"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Creating new room: <strong>{newRoomName || '(enter name)'}</strong>
        </p>
      </div>
    )
  }

  return (
    <select
      value={value || ''}
      onChange={handleSelectChange}
      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
    >
      <option value="">{placeholder}</option>
      {existingRooms.map(room => (
        <option key={room} value={room}>
          {room}
        </option>
      ))}
      <option value="__add_new__">+ Add New Room</option>
    </select>
  )
}

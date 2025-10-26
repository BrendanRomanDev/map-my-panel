import { useState } from 'react'

interface Step1AddRoomsProps {
  rooms: string[]
  onUpdate: (rooms: string[]) => void
  onNext: () => void
}

export function Step1AddRooms({ rooms, onUpdate, onNext }: Step1AddRoomsProps) {
  const [roomInput, setRoomInput] = useState('')

  const addRoom = () => {
    const trimmedRoom = roomInput.trim()
    if (trimmedRoom && !rooms.includes(trimmedRoom)) {
      onUpdate([...rooms, trimmedRoom])
      setRoomInput('')
    }
  }

  const removeRoom = (room: string) => {
    onUpdate(rooms.filter(r => r !== room))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addRoom()
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 1: Add Rooms (Optional)</h2>
      <p className="text-muted-foreground mb-6">
        List the rooms in your house to help organize your entities. You can skip this step if
        you prefer.
      </p>

      {/* Room input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={roomInput}
          onChange={e => setRoomInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter room name (e.g., Kitchen, Living Room)"
          className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
        />
        <button
          onClick={addRoom}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add
        </button>
      </div>

      {/* Room list */}
      {rooms.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Rooms ({rooms.length})</h3>
          <div className="flex flex-wrap gap-2">
            {rooms.map(room => (
              <div
                key={room}
                className="flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-md"
              >
                <span>{room}</span>
                <button
                  onClick={() => removeRoom(room)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end gap-2 mt-8">
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {rooms.length > 0 ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  )
}

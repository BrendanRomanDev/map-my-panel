import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { HistoryRepository } from '../db/repositories'
import type {
  HistoryEvent,
  HistoryEventWithDetails,
  RolledUpHistoryEvent,
  CreateHistoryEventInput,
  UpdateHistoryEventInput,
  EventType,
  CreateEventTypeInput,
  UpdateEventTypeInput,
  TargetType,
  TargetRef
} from '../../shared/types'

export function registerHistoryHandlers(): void {
  const db = getDatabase()
  const repo = new HistoryRepository(db)

  // Events
  ipcMain.handle('history:createEvent', async (_, input: CreateHistoryEventInput): Promise<HistoryEventWithDetails> => {
    return repo.createEvent(input)
  })

  ipcMain.handle('history:updateEvent', async (_, id: string, input: UpdateHistoryEventInput): Promise<HistoryEventWithDetails | null> => {
    return repo.updateEvent(id, input)
  })

  ipcMain.handle('history:deleteEvent', async (_, id: string): Promise<boolean> => {
    return repo.deleteEvent(id)
  })

  ipcMain.handle('history:findById', async (_, id: string): Promise<HistoryEvent | null> => {
    return repo.findById(id)
  })

  // Links
  ipcMain.handle('history:addTargets', async (_, eventId: string, targets: TargetRef[]): Promise<void> => {
    return repo.addTargets(eventId, targets)
  })

  ipcMain.handle('history:removeTarget', async (_, eventId: string, targetType: TargetType, targetId: string): Promise<boolean> => {
    return repo.removeTarget(eventId, targetType, targetId)
  })

  // Queries
  ipcMain.handle('history:listForTarget', async (_, targetType: TargetType, targetId: string): Promise<HistoryEventWithDetails[]> => {
    return repo.listForTarget(targetType, targetId)
  })

  ipcMain.handle('history:listForProperty', async (_, propertyId: string): Promise<HistoryEventWithDetails[]> => {
    return repo.listForProperty(propertyId)
  })

  ipcMain.handle('history:listForBreakerRollup', async (_, breakerId: string): Promise<RolledUpHistoryEvent[]> => {
    return repo.listForBreakerRollup(breakerId)
  })

  // Event types
  ipcMain.handle('history:listEventTypes', async (_, propertyId: string): Promise<EventType[]> => {
    return repo.listEventTypes(propertyId)
  })

  ipcMain.handle('history:createEventType', async (_, input: CreateEventTypeInput): Promise<EventType> => {
    return repo.createEventType(input)
  })

  ipcMain.handle('history:updateEventType', async (_, id: string, input: UpdateEventTypeInput): Promise<EventType | null> => {
    return repo.updateEventType(id, input)
  })

  ipcMain.handle('history:deleteEventType', async (_, id: string): Promise<boolean> => {
    return repo.deleteEventType(id)
  })

  ipcMain.handle('history:countEventsForType', async (_, eventTypeId: string): Promise<number> => {
    return repo.countEventsForType(eventTypeId)
  })
}

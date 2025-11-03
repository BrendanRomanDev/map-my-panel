import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { EntityRepository } from '../db/repositories'
import type {
  Entity,
  EntitiesByRoom,
  CreateEntityInput,
  UpdateEntityInput
} from '../../shared/types'

export function registerEntityHandlers(): void {
  const db = getDatabase()
  const entityRepo = new EntityRepository(db)

  ipcMain.handle('entities:create', async (_, input: CreateEntityInput): Promise<Entity> => {
    return entityRepo.create(input)
  })

  ipcMain.handle('entities:createBatch', async (_, inputs: CreateEntityInput[]): Promise<Entity[]> => {
    return entityRepo.createBatch(inputs)
  })

  ipcMain.handle('entities:findById', async (_, id: string): Promise<Entity | null> => {
    return entityRepo.findById(id)
  })

  ipcMain.handle('entities:listByPanel', async (_, panelId: string): Promise<Entity[]> => {
    return entityRepo.listByPanel(panelId)
  })

  ipcMain.handle('entities:listByBreaker', async (_, breakerId: string): Promise<Entity[]> => {
    return entityRepo.listByBreaker(breakerId)
  })

  ipcMain.handle('entities:listUnmapped', async (_, panelId: string): Promise<Entity[]> => {
    return entityRepo.listUnmapped(panelId)
  })

  ipcMain.handle('entities:groupByRoom', async (_, panelId: string): Promise<EntitiesByRoom[]> => {
    return entityRepo.groupByRoom(panelId)
  })

  ipcMain.handle('entities:search', async (_, panelId: string, query: string): Promise<Entity[]> => {
    return entityRepo.search(panelId, query)
  })

  ipcMain.handle('entities:assignToBreaker', async (_, entityIds: string[], breakerId: string): Promise<void> => {
    return entityRepo.assignToBreaker(entityIds, breakerId)
  })

  ipcMain.handle('entities:unassignFromBreaker', async (_, entityIds: string[]): Promise<void> => {
    return entityRepo.unassignFromBreaker(entityIds)
  })

  ipcMain.handle('entities:update', async (_, id: string, input: UpdateEntityInput): Promise<Entity | null> => {
    return entityRepo.update(id, input)
  })

  ipcMain.handle('entities:delete', async (_, id: string): Promise<boolean> => {
    return entityRepo.delete(id)
  })

  // Room management handlers
  ipcMain.handle('entities:getAllRooms', async (_, panelId: string): Promise<Array<{ room: string; count: number }>> => {
    return entityRepo.getAllRooms(panelId)
  })

  ipcMain.handle('entities:deleteRoom', async (_, panelId: string, roomName: string): Promise<number> => {
    return entityRepo.deleteRoom(panelId, roomName)
  })

  ipcMain.handle('entities:renameRoom', async (_, panelId: string, oldName: string, newName: string): Promise<number> => {
    return entityRepo.renameRoom(panelId, oldName, newName)
  })

  // Type management handlers
  ipcMain.handle('entities:getAllEntityTypes', async (_, panelId: string): Promise<Array<{ entity_type: string; count: number }>> => {
    return entityRepo.getAllEntityTypes(panelId)
  })

  ipcMain.handle('entities:changeEntityType', async (_, panelId: string, oldType: string, newType: string): Promise<number> => {
    return entityRepo.changeEntityType(panelId, oldType, newType)
  })
}

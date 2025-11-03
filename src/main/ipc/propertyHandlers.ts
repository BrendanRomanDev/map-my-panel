import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { PropertyRepository } from '../db/repositories'
import type { Property, CreatePropertyInput, UpdatePropertyInput } from '../../shared/types'

export function registerPropertyHandlers(): void {
  const db = getDatabase()
  const propertyRepo = new PropertyRepository(db)

  ipcMain.handle('properties:create', async (_, input: CreatePropertyInput): Promise<Property> => {
    return propertyRepo.create(input)
  })

  ipcMain.handle('properties:getCurrentOrNull', async (): Promise<Property | null> => {
    return propertyRepo.getCurrentOrNull()
  })

  ipcMain.handle('properties:findAll', async (): Promise<Property[]> => {
    return propertyRepo.findAll()
  })

  ipcMain.handle('properties:findById', async (_, id: string): Promise<Property | null> => {
    return propertyRepo.findById(id)
  })

  ipcMain.handle('properties:setAsCurrent', async (_, id: string): Promise<Property | null> => {
    return propertyRepo.setAsCurrent(id)
  })

  ipcMain.handle('properties:update', async (_, id: string, input: UpdatePropertyInput): Promise<Property | null> => {
    return propertyRepo.update(id, input)
  })

  ipcMain.handle('properties:delete', async (_, id: string): Promise<boolean> => {
    return propertyRepo.delete(id)
  })

  ipcMain.handle('properties:addCustomEntityType', async (_, propertyId: string, newType: string): Promise<Property | null> => {
    return propertyRepo.addCustomEntityType(propertyId, newType)
  })

  ipcMain.handle('properties:removeCustomEntityType', async (_, propertyId: string, typeToRemove: string): Promise<Property | null> => {
    return propertyRepo.removeCustomEntityType(propertyId, typeToRemove)
  })
}

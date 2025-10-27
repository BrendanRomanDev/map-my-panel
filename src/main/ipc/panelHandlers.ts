import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { PanelRepository } from '../db/repositories'
import type { Panel, CreatePanelInput, UpdatePanelInput } from '../../shared/types'

export function registerPanelHandlers(): void {
  const db = getDatabase()
  const panelRepo = new PanelRepository(db)

  ipcMain.handle('panels:create', async (_, input: CreatePanelInput): Promise<Panel> => {
    return panelRepo.create(input)
  })

  ipcMain.handle('panels:getCurrentOrNull', async (): Promise<Panel | null> => {
    return panelRepo.getCurrentOrNull()
  })

  ipcMain.handle('panels:findAll', async (): Promise<Panel[]> => {
    return panelRepo.findAll()
  })

  ipcMain.handle('panels:findById', async (_, id: string): Promise<Panel | null> => {
    return panelRepo.findById(id)
  })

  ipcMain.handle('panels:update', async (_, id: string, input: UpdatePanelInput): Promise<Panel | null> => {
    return panelRepo.update(id, input)
  })

  ipcMain.handle('panels:delete', async (_, id: string): Promise<boolean> => {
    return panelRepo.delete(id)
  })

  ipcMain.handle('panels:reset', async (_, id: string): Promise<{ entitiesDeleted: number; breakersDeleted: number }> => {
    return panelRepo.resetPanel(id)
  })
}

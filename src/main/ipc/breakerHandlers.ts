import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { BreakerRepository } from '../db/repositories'
import type {
  Breaker,
  BreakerWithEntityCount,
  CreateBreakerInput,
  UpdateBreakerInput
} from '../../shared/types'

export function registerBreakerHandlers(): void {
  const db = getDatabase()
  const breakerRepo = new BreakerRepository(db)

  ipcMain.handle('breakers:create', async (_, input: CreateBreakerInput): Promise<Breaker> => {
    return breakerRepo.create(input)
  })

  ipcMain.handle('breakers:createBatch', async (_, inputs: CreateBreakerInput[]): Promise<Breaker[]> => {
    return breakerRepo.createBatch(inputs)
  })

  ipcMain.handle('breakers:findById', async (_, id: string): Promise<Breaker | null> => {
    return breakerRepo.findById(id)
  })

  ipcMain.handle('breakers:listByPanel', async (_, panelId: string): Promise<BreakerWithEntityCount[]> => {
    return breakerRepo.listByPanel(panelId)
  })

  ipcMain.handle('breakers:update', async (_, id: string, input: UpdateBreakerInput): Promise<Breaker | null> => {
    return breakerRepo.update(id, input)
  })

  ipcMain.handle('breakers:delete', async (_, id: string): Promise<boolean> => {
    return breakerRepo.delete(id)
  })
}

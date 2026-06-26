import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { TaskRepository } from '../db/repositories'
import type { Task, TaskWithEntity, CreateTaskInput, UpdateTaskInput } from '../../shared/types'

export function registerTaskHandlers(): void {
  const db = getDatabase()
  const repo = new TaskRepository(db)

  ipcMain.handle('tasks:create', async (_, input: CreateTaskInput): Promise<Task> => {
    return repo.create(input)
  })

  ipcMain.handle('tasks:update', async (_, id: string, input: UpdateTaskInput): Promise<Task | null> => {
    return repo.update(id, input)
  })

  ipcMain.handle('tasks:complete', async (_, id: string): Promise<Task | null> => {
    return repo.complete(id)
  })

  ipcMain.handle('tasks:reopen', async (_, id: string): Promise<Task | null> => {
    return repo.reopen(id)
  })

  ipcMain.handle('tasks:delete', async (_, id: string): Promise<boolean> => {
    return repo.delete(id)
  })

  ipcMain.handle('tasks:listForEntity', async (_, entityId: string): Promise<Task[]> => {
    return repo.listForEntity(entityId)
  })

  ipcMain.handle('tasks:listForPanel', async (_, panelId: string): Promise<TaskWithEntity[]> => {
    return repo.listForPanel(panelId)
  })

  ipcMain.handle('tasks:openCountForEntity', async (_, entityId: string): Promise<number> => {
    return repo.openCountForEntity(entityId)
  })
}

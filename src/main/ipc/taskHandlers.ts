import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { TaskRepository } from '../db/repositories'
import type { Task, TaskWithTarget, CreateTaskInput, UpdateTaskInput, TaskTemplate, CreateTaskTemplateInput, TargetType } from '../../shared/types'

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

  ipcMain.handle('tasks:completeWithRules', async (_, id: string, propertyId: string, opts: any): Promise<Task | null> => {
    return repo.completeWithRules(id, propertyId, opts)
  })

  ipcMain.handle('tasks:reopen', async (_, id: string): Promise<Task | null> => {
    return repo.reopen(id)
  })

  ipcMain.handle('tasks:delete', async (_, id: string): Promise<boolean> => {
    return repo.delete(id)
  })

  ipcMain.handle('tasks:listForTarget', async (_, targetType: TargetType, targetId: string): Promise<Task[]> => {
    return repo.listForTarget(targetType, targetId)
  })

  ipcMain.handle('tasks:listForProperty', async (_, propertyId: string): Promise<TaskWithTarget[]> => {
    return repo.listForProperty(propertyId)
  })

  ipcMain.handle('tasks:openCountForTarget', async (_, targetType: TargetType, targetId: string): Promise<number> => {
    return repo.openCountForTarget(targetType, targetId)
  })

  // Templates
  ipcMain.handle('tasks:listTemplates', async (_, propertyId: string): Promise<TaskTemplate[]> => {
    return repo.listTemplates(propertyId)
  })

  ipcMain.handle('tasks:createTemplate', async (_, input: CreateTaskTemplateInput): Promise<TaskTemplate> => {
    return repo.createTemplate(input)
  })

  ipcMain.handle('tasks:deleteTemplate', async (_, id: string): Promise<boolean> => {
    return repo.deleteTemplate(id)
  })

  ipcMain.handle('tasks:createFromTemplate', async (_, templateId: string, targets: { target_type: TargetType; target_id: string }[]): Promise<string[]> => {
    return repo.createFromTemplate(templateId, targets)
  })
}

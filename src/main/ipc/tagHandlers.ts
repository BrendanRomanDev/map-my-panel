import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { TagRepository } from '../db/repositories'
import type { Tag, TagLink, CreateTagInput, UpdateTagInput, TargetType } from '../../shared/types'

export function registerTagHandlers(): void {
  const db = getDatabase()
  const tagRepo = new TagRepository(db)

  ipcMain.handle('tags:create', async (_, input: CreateTagInput): Promise<Tag> => {
    return tagRepo.create(input)
  })

  ipcMain.handle('tags:findById', async (_, id: string): Promise<Tag | null> => {
    return tagRepo.findById(id)
  })

  ipcMain.handle('tags:listForProperty', async (_, propertyId: string): Promise<Tag[]> => {
    return tagRepo.listForProperty(propertyId)
  })

  ipcMain.handle('tags:listForTarget', async (_, targetType: TargetType, targetId: string): Promise<Tag[]> => {
    return tagRepo.listForTarget(targetType, targetId)
  })

  ipcMain.handle('tags:update', async (_, id: string, input: UpdateTagInput): Promise<Tag | null> => {
    return tagRepo.update(id, input)
  })

  ipcMain.handle('tags:delete', async (_, id: string): Promise<boolean> => {
    return tagRepo.delete(id)
  })

  ipcMain.handle('tags:attach', async (_, tagId: string, targetType: TargetType, targetId: string): Promise<void> => {
    return tagRepo.attach(tagId, targetType, targetId)
  })

  ipcMain.handle('tags:detach', async (_, tagId: string, targetType: TargetType, targetId: string): Promise<void> => {
    return tagRepo.detach(tagId, targetType, targetId)
  })

  ipcMain.handle('tags:listTargetsForTag', async (_, tagId: string): Promise<TagLink[]> => {
    return tagRepo.listTargetsForTag(tagId)
  })
}

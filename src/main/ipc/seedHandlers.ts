import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { BackupRepository } from '../db/repositories'
import type { BackupData } from '../db/repositories/BackupRepository'
import sampleSeed from '../db/seed/sample-panel.json'

export function registerSeedHandlers(): void {
  const db = getDatabase()
  const backupRepo = new BackupRepository(db)

  ipcMain.handle(
    'seed:loadSample',
    async (): Promise<{ success: boolean; message: string }> => {
      try {
        // The seed is a v2.0 BackupData object hand-authored at
        // src/main/db/seed/sample-panel.json. Reusing BackupRepository.importDatabase
        // means the seed loader and user-facing "Restore from Backup" share the same
        // (well-tested) insertion path.
        backupRepo.importDatabase(sampleSeed as unknown as BackupData)
        return { success: true, message: 'Sample panel loaded' }
      } catch (error) {
        console.error('Seed load failed:', error)
        return { success: false, message: `Failed to load sample: ${error}` }
      }
    }
  )
}

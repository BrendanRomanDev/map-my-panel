import { ipcMain, dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import { getDatabase } from '../db/database'
import { BackupRepository } from '../db/repositories'
import type { BackupData } from '../db/repositories/BackupRepository'

export function registerBackupHandlers(): void {
  const db = getDatabase()
  const backupRepo = new BackupRepository(db)

  ipcMain.handle('backup:export', async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Get backup data
      const backupData = backupRepo.exportDatabase()

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Panel Backup',
        defaultPath: `panel-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export canceled' }
      }

      // Write backup to file
      writeFileSync(result.filePath, JSON.stringify(backupData, null, 2), 'utf-8')

      return { success: true, message: `Backup saved to ${result.filePath}` }
    } catch (error) {
      console.error('Backup export failed:', error)
      return { success: false, message: `Export failed: ${error}` }
    }
  })

  ipcMain.handle('backup:import', async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import Panel Backup',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Import canceled' }
      }

      // Read backup file
      const fileContent = readFileSync(result.filePaths[0], 'utf-8')
      const backupData: BackupData = JSON.parse(fileContent)

      // Import backup
      backupRepo.importDatabase(backupData)

      return { success: true, message: 'Backup imported successfully' }
    } catch (error) {
      console.error('Backup import failed:', error)
      return { success: false, message: `Import failed: ${error}` }
    }
  })
}

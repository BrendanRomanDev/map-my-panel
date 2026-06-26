import { registerPropertyHandlers } from './propertyHandlers'
import { registerPanelHandlers } from './panelHandlers'
import { registerBreakerHandlers } from './breakerHandlers'
import { registerEntityHandlers } from './entityHandlers'
import { registerBackupHandlers } from './backupHandlers'
import { registerSeedHandlers } from './seedHandlers'
import { registerTagHandlers } from './tagHandlers'
import { registerHistoryHandlers } from './historyHandlers'
import { registerTaskHandlers } from './taskHandlers'

export function registerAllHandlers(): void {
  registerPropertyHandlers()
  registerPanelHandlers()
  registerBreakerHandlers()
  registerEntityHandlers()
  registerBackupHandlers()
  registerSeedHandlers()
  registerTagHandlers()
  registerHistoryHandlers()
  registerTaskHandlers()
}

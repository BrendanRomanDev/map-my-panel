import { registerPropertyHandlers } from './propertyHandlers'
import { registerPanelHandlers } from './panelHandlers'
import { registerBreakerHandlers } from './breakerHandlers'
import { registerEntityHandlers } from './entityHandlers'
import { registerBackupHandlers } from './backupHandlers'
import { registerSeedHandlers } from './seedHandlers'

export function registerAllHandlers(): void {
  registerPropertyHandlers()
  registerPanelHandlers()
  registerBreakerHandlers()
  registerEntityHandlers()
  registerBackupHandlers()
  registerSeedHandlers()
}

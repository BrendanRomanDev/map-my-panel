import { registerPanelHandlers } from './panelHandlers'
import { registerBreakerHandlers } from './breakerHandlers'
import { registerEntityHandlers } from './entityHandlers'

export function registerAllHandlers(): void {
  registerPanelHandlers()
  registerBreakerHandlers()
  registerEntityHandlers()
}

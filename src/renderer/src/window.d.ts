import type { WindowControls } from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
  }
}

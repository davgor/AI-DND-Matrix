import type { KeyValueStorage } from '../sidebar/sidebarPreferences'

const PLAYER_SHEET_COLLAPSED_KEY = 'playerSheet:collapsed'

export function getPlayerSheetCollapsed(storage: KeyValueStorage): boolean {
  return storage.getItem(PLAYER_SHEET_COLLAPSED_KEY) === 'true'
}

export function setPlayerSheetCollapsed(storage: KeyValueStorage, collapsed: boolean): void {
  storage.setItem(PLAYER_SHEET_COLLAPSED_KEY, String(collapsed))
}

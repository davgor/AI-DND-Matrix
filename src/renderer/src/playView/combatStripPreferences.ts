import type { KeyValueStorage } from '../sidebar/sidebarPreferences'

const COMBAT_STRIP_COLLAPSED_KEY = 'playView:combatStripCollapsed'

export function getCombatStripCollapsed(storage: KeyValueStorage): boolean {
  return storage.getItem(COMBAT_STRIP_COLLAPSED_KEY) === 'true'
}

export function setCombatStripCollapsed(storage: KeyValueStorage, collapsed: boolean): void {
  storage.setItem(COMBAT_STRIP_COLLAPSED_KEY, String(collapsed))
}

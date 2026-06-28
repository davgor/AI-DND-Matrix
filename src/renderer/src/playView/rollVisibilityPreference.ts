export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const ROLL_VISIBILITY_KEY = 'playView:showRolls'

export function getShowRolls(storage: KeyValueStorage): boolean {
  return storage.getItem(ROLL_VISIBILITY_KEY) !== 'false'
}

export function setShowRolls(storage: KeyValueStorage, showRolls: boolean): void {
  storage.setItem(ROLL_VISIBILITY_KEY, String(showRolls))
}

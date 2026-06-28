export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'

export function getSidebarCollapsed(storage: KeyValueStorage): boolean {
  return storage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

export function setSidebarCollapsed(storage: KeyValueStorage, collapsed: boolean): void {
  storage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
}

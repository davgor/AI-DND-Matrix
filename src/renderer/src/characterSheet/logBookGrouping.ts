import { LOG_CATEGORIES, type LogCategory, type LogEntry } from '../../../shared/logBook/types'

export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  event: 'Events',
  place: 'Places',
  person: 'People',
  beast: 'Bestiary',
  thing: 'Things'
}

export function groupLogEntriesByCategory(entries: LogEntry[]): Record<LogCategory, LogEntry[]> {
  const grouped = Object.fromEntries(LOG_CATEGORIES.map((category) => [category, []])) as Record<
    LogCategory,
    LogEntry[]
  >
  for (const entry of entries) {
    grouped[entry.category].push(entry)
  }
  return grouped
}

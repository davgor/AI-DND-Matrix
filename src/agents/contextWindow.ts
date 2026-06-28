export const DEFAULT_RECENCY_WINDOW = 20

export function takeRecent<T>(items: T[], limit: number = DEFAULT_RECENCY_WINDOW): T[] {
  if (items.length <= limit) {
    return items
  }
  return items.slice(items.length - limit)
}

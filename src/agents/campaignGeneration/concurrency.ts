/**
 * Maps `items` through an async `task`, keeping at most `limit` (>= 1) tasks
 * in flight at once. Results are returned in input order. A rejected task
 * rejects the whole map — callers that want per-item failure isolation
 * should catch inside `task`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0
  const runWorker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await task(items[index]!, index)
    }
  }
  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, runWorker))
  return results
}

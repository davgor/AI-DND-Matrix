export interface SaveSnapshot {
  id: string
  createdAt: number
  state: unknown
}

export function resolveStandardDeath(precedingSnapshots: SaveSnapshot[]): SaveSnapshot {
  if (precedingSnapshots.length === 0) {
    throw new Error('no save snapshot available to restore')
  }
  return precedingSnapshots.reduce((latest, snapshot) =>
    snapshot.createdAt > latest.createdAt ? snapshot : latest
  )
}

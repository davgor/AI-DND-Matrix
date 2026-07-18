/** Prefer the agent's proposed scene; otherwise reuse the already-persisted opening scene. */
export function resolveOpeningSceneForReady(
  proposedOpeningScene: string | null,
  persistedOpeningScene: string | null
): string | null {
  const proposed = proposedOpeningScene?.trim()
  if (proposed) {
    return proposed
  }
  const persisted = persistedOpeningScene?.trim()
  return persisted || null
}

const SHORT_AFFIRMATIVE =
  /^(y(es|eah|ep|up)?|sure|ok(ay)?|perfect|sounds good|looks good|that works|works for me|let'?s (go|begin|start)|let us begin)\b/i

/** True when the player clearly accepts the proposed opening scene. */
export function isOpeningSceneConfirmation(playerMessage: string): boolean {
  const normalized = playerMessage.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return false
  }
  if (SHORT_AFFIRMATIVE.test(normalized)) {
    return true
  }
  return /\b(works for me|looks good( to me)?|that works( for me)?|let'?s begin|let us begin)\b/i.test(
    normalized
  )
}

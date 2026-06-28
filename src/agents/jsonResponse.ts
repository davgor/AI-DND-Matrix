const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const match = CODE_FENCE_PATTERN.exec(trimmed)
  return match ? match[1] : trimmed
}

export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(stripCodeFence(raw))
  } catch {
    return undefined
  }
}

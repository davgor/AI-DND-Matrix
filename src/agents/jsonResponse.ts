const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const match = CODE_FENCE_PATTERN.exec(trimmed)
  return match ? match[1] : trimmed
}

function extractJsonObject(raw: string): string {
  const stripped = stripCodeFence(raw)
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return stripped.slice(start, end + 1)
  }
  return stripped
}

export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(extractJsonObject(raw))
  } catch {
    return undefined
  }
}

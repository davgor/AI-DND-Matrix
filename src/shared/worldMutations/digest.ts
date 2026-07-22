import {
  WORLD_MUTATION_DIGEST_LINE_MAX_CHARS,
  WORLD_MUTATION_DIGEST_MAX_CHARS,
  WORLD_MUTATION_DIGEST_MAX_NPC_LINES,
  type RegionStatusSnapshot
} from './types'

function clipLine(text: string): string {
  if (text.length <= WORLD_MUTATION_DIGEST_LINE_MAX_CHARS) {
    return text
  }
  return `${text.slice(0, WORLD_MUTATION_DIGEST_LINE_MAX_CHARS - 1)}…`
}

function regionConditionLine(regionName: string, status: RegionStatusSnapshot): string | null {
  if (status.destroyed) {
    const cause = status.cause ? ` (${status.cause})` : ''
    return clipLine(
      `Region "${regionName}" DESTROYED${cause}. Require op "restore" to treat as intact.`
    )
  }
  if (status.damaged) {
    const cause = status.cause ? ` (${status.cause})` : ''
    return clipLine(`Region "${regionName}" damaged${cause}. Reflect structural harm.`)
  }
  return null
}

function deadNpcLines(
  npcs: ReadonlyArray<{ name: string; alive: boolean }>
): string[] {
  const dead = npcs.filter((npc) => !npc.alive).slice(0, WORLD_MUTATION_DIGEST_MAX_NPC_LINES)
  return dead.map((npc) => clipLine(`NPC "${npc.name}" is dead/absent — do not treat as living here.`))
}

/**
 * Slim grounding digest for destroyed/altered places and dead NPCs.
 * Returns undefined when there is nothing to emphasize (token discipline).
 */
export function buildWorldMutationDigest(input: {
  regionName: string
  regionStatus: RegionStatusSnapshot
  presentNpcs: ReadonlyArray<{ name: string; alive: boolean }>
}): string | undefined {
  const lines: string[] = []
  const regionLine = regionConditionLine(input.regionName, input.regionStatus)
  if (regionLine) {
    lines.push(regionLine)
  }
  lines.push(...deadNpcLines(input.presentNpcs))
  if (lines.length === 0) {
    return undefined
  }
  let digest = lines.join(' ')
  if (digest.length > WORLD_MUTATION_DIGEST_MAX_CHARS) {
    digest = `${digest.slice(0, WORLD_MUTATION_DIGEST_MAX_CHARS - 1)}…`
  }
  return digest
}

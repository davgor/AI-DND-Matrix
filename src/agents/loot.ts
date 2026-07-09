import type { ItemGrantProposal } from './dm'
import { tryParseJson } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import { MAX_SCHEMA_ATTEMPTS } from './dm'
import { buildAgentSystemPrompt } from './sharedSystemPrompts'
import { listLootExemplarsForPolicy } from '../engine/lootProfiles'
import type { CatalogItem } from '../shared/items/types'
import { ITEM_TYPES } from '../shared/items/types'
import type { LootContext, LootPolicy } from '../shared/loot/types'

export interface LootAgentResponse {
  narrationText: string
  itemGrants: ItemGrantProposal[]
  nothingToFind: boolean
}

function isCatalogGrant(value: object): value is { catalogItemId: string } {
  return 'catalogItemId' in value && typeof (value as { catalogItemId: unknown }).catalogItemId === 'string'
}

function isProposeNewGrant(value: object): value is {
  proposeNew: { name: string; description: string; itemType: string; rarityTier: string }
} {
  if (!('proposeNew' in value)) {
    return false
  }
  const proposal = (value as { proposeNew: unknown }).proposeNew
  if (!proposal || typeof proposal !== 'object') {
    return false
  }
  const p = proposal as Record<string, unknown>
  return (
    typeof p.name === 'string' &&
    typeof p.description === 'string' &&
    typeof p.itemType === 'string' &&
    (ITEM_TYPES as readonly string[]).includes(p.itemType as string) &&
    typeof p.rarityTier === 'string'
  )
}

function isItemGrantProposal(value: unknown): value is ItemGrantProposal {
  if (!value || typeof value !== 'object') {
    return false
  }
  return isCatalogGrant(value) || isProposeNewGrant(value)
}

export function parseLootAgentResponse(raw: unknown, maxGrantCount: number): LootAgentResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const body = raw as Record<string, unknown>
  if (typeof body.narrationText !== 'string') {
    return null
  }
  if (typeof body.nothingToFind !== 'boolean') {
    return null
  }
  const grantsRaw = body.itemGrants
  if (!Array.isArray(grantsRaw)) {
    return null
  }
  const itemGrants = grantsRaw.filter(isItemGrantProposal).slice(0, maxGrantCount)
  if (body.nothingToFind && itemGrants.length > 0) {
    return null
  }
  return { narrationText: body.narrationText, itemGrants, nothingToFind: body.nothingToFind }
}

function formatCandidates(candidates: CatalogItem[]): string {
  if (candidates.length === 0) {
    return '(no catalog matches — proposeNew only within policy)'
  }
  return JSON.stringify(
    candidates.map((c) => ({
      catalogItemId: c.id,
      name: c.name,
      itemType: c.itemType,
      rarity: c.rarity
    }))
  )
}

// 040.9: schema + static realism/retrieve-first rules ride in systemPrompt;
// the one shared context object keeps every schema-retry attempt identical.
const LOOT_GENERATE_CONTEXT: GenerateContext = {
  systemPrompt: buildAgentSystemPrompt({
    schemaFragment:
      '{"narrationText":string,"itemGrants":Array<{"catalogItemId":string}|{"proposeNew":{"name":string,"description":string,"itemType":"weapon"|"armor"|"potion"|"magicItem"|"misc","rarityTier":string}}>,"nothingToFind":boolean}',
    guidanceLines: [
      'Realism: wolves and beasts yield pelts, fangs, misc salvage only — never weapons or magic items.',
      'Retrieve-first: prefer catalogItemId from the candidate list in the user message.',
      'Do not invent mechanical stats — only name, description, itemType, rarityTier for proposeNew.'
    ]
  })
}

export function buildLootPrompt(ctx: LootContext, policy: LootPolicy, candidates: CatalogItem[]): string {
  const exemplars = listLootExemplarsForPolicy(policy)
  const sourceLine =
    ctx.source === 'encounter_end'
      ? `Defeated foes: ${JSON.stringify(ctx.foes.map((f) => ({ role: f.npcRole, buckets: f.buckets, outcome: f.outcome })))}`
      : `Quest hook: ${ctx.questHookText ?? '(none)'}; scale: ${ctx.questScale ?? 'minor'}`

  return [
    `Loot source: ${ctx.source}`,
    sourceLine,
    `Player level: ${ctx.playerLevel}`,
    `Policy — allowed types: ${policy.allowedItemTypes.join(', ')}; max rarity: ${policy.maxRarity}; max grants: ${policy.maxGrantCount}`,
    `Catalog candidates: ${formatCandidates(candidates)}`,
    `Flavor exemplars (suggestions only): ${JSON.stringify(exemplars.map((e) => e.name))}`
  ].join('\n')
}

export async function resolveLoot(
  provider: Provider,
  ctx: LootContext,
  policy: LootPolicy,
  candidates: CatalogItem[]
): Promise<LootAgentResponse> {
  const prompt = buildLootPrompt(ctx, policy, candidates)
  for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt += 1) {
    const raw = await provider.generate(prompt, LOOT_GENERATE_CONTEXT)
    const parsed = parseLootAgentResponse(tryParseJson(raw), policy.maxGrantCount)
    if (parsed) {
      return parsed
    }
  }
  return {
    narrationText: 'You search the scene but find nothing of value.',
    itemGrants: [],
    nothingToFind: true
  }
}

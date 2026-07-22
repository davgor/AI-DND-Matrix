import { generateJsonWithRetry } from './jsonResponse'
import type { GenerateContext, Provider } from './providers/types'
import type { LevelSpanContext, PerkProposal } from '../shared/progression/types'
import { parseLevelUpAgentResponse } from '../shared/progression/types'

// 040.1: 512 — narration line plus exactly 3 perks, each with a name, short
// description, and flavor tags; larger than the one-liner bands but bounded.
const LEVEL_UP_GENERATE_CONTEXT: GenerateContext = { maxTokens: 512, purpose: 'play.loot_xp' }

export interface LevelUpAgentResult {
  narrationText: string
  perks: import('../shared/progression/types').PerkProposal[]
}

export function buildLevelUpPrompt(ctx: LevelSpanContext): string {
  return [
    `Level-up ceremony for ${ctx.archetype} reaching level ${ctx.newLevel}.`,
    `Activity tags: ${JSON.stringify(ctx.activityTags)}`,
    `Emergent direction: ${JSON.stringify(ctx.emergentDirection)}`,
    `Recent events: ${JSON.stringify(ctx.recentEventSummaries)}`,
    `Journal: ${JSON.stringify(ctx.journalSnippets)}`,
    `Log book: ${JSON.stringify(ctx.logBookSnippets)}`,
    'Rules:',
    '- Exactly 3 perks with distinct ids',
    '- Categories from: ac_bonus, extra_attack, spell_access, hp_max_bonus, check_proficiency, passive_feature, custom_feature',
    '- Heavy arcane tags → include spell_access; heavy combat → extra_attack or ac_bonus',
    '- When emergentDirection is non-null, include a custom_feature or passive_feature flavored by that tag',
    '- No mechanical numbers in output — engine clamps feature numbers from templates',
    '- Narration must reference themes from context only',
    'Respond ONLY with JSON:',
    '{"narrationText":string,"perks":[{"id":string,"name":string,"description":string,"category":string,"flavorTags":string[],"catalogSpellKey"?:string,"proficiencyAbility"?:string}]}'
  ].join('\n')
}

export async function resolveLevelUpPerks(
  provider: Provider,
  ctx: LevelSpanContext
): Promise<LevelUpAgentResult> {
  const prompt = buildLevelUpPrompt(ctx)
  return generateJsonWithRetry(
    provider,
    prompt,
    (parsed) => parseLevelUpAgentResponse(parsed) ?? undefined,
    {
      context: {
        ...LEVEL_UP_GENERATE_CONTEXT,
        campaignId: ctx.campaignId,
        characterId: ctx.characterId
      },
      fallback: () => fallbackLevelUpOptions(ctx)
    }
  )
}

function emergentCustomFeature(tag: string): PerkProposal {
  return {
    id: 'fe1',
    name: 'Emergent Spark',
    description: `A ${tag}-tinged talent takes shape.`,
    category: 'custom_feature',
    flavorTags: [tag]
  }
}

function martialOrScholarSecondary(martial: boolean): PerkProposal {
  if (martial) {
    return {
      id: 'fe2',
      name: 'Battle Hardened',
      description: 'Your skin turns blows aside.',
      category: 'ac_bonus',
      flavorTags: ['martial']
    }
  }
  return {
    id: 'fe2',
    name: "Scholar's Insight",
    description: 'Patterns reveal themselves.',
    category: 'check_proficiency',
    flavorTags: ['arcane'],
    proficiencyAbility: 'mind'
  }
}

function emergentFallback(tag: string, martial: boolean): LevelUpAgentResult {
  return {
    narrationText: `Your repeated ${tag} practice forges something new.`,
    perks: [
      emergentCustomFeature(tag),
      martialOrScholarSecondary(martial),
      {
        id: 'fe3',
        name: "Veteran's Endurance",
        description: 'Hardship has expanded your vitality.',
        category: 'hp_max_bonus',
        flavorTags: [tag]
      }
    ]
  }
}

function fallbackLevelUpOptions(ctx: LevelSpanContext): LevelUpAgentResult {
  const emergent = ctx.emergentDirection
  const martial = ctx.activityTags.combat >= ctx.activityTags.arcane
  if (emergent) {
    return emergentFallback(emergent.tag, martial)
  }
  if (martial) {
    return {
      narrationText: 'Your trials in battle have hardened you.',
      perks: [
        { id: 'fb1', name: 'Battle Hardened', description: 'Your skin turns blows aside.', category: 'ac_bonus', flavorTags: ['martial'] },
        { id: 'fb2', name: 'Relentless Strike', description: 'You strike again before foes recover.', category: 'extra_attack', flavorTags: ['combat'] },
        { id: 'fb3', name: "Veteran's Endurance", description: 'Hardship has expanded your vitality.', category: 'hp_max_bonus', flavorTags: ['martial'] }
      ]
    }
  }
  return {
    narrationText: 'Quiet study and curious practice reshape your talents.',
    perks: [
      { id: 'fa1', name: 'Arcane Spark', description: 'A cantrip lodges in your mind.', category: 'spell_access', flavorTags: ['arcane'], catalogSpellKey: 'arcane-bolt' },
      { id: 'fa2', name: "Scholar's Insight", description: 'Patterns reveal themselves.', category: 'check_proficiency', flavorTags: ['arcane'], proficiencyAbility: 'mind' },
      { id: 'fa3', name: 'Mystic Resonance', description: 'Latent power stirs within.', category: 'custom_feature', flavorTags: ['arcane'] }
    ]
  }
}

export function hasMartialOption(result: LevelUpAgentResult): boolean {
  return result.perks.some((p) => p.category === 'extra_attack' || p.category === 'ac_bonus')
}

export function hasArcaneOption(result: LevelUpAgentResult): boolean {
  return result.perks.some(
    (p) => p.category === 'spell_access' || (p.category === 'custom_feature' && p.flavorTags.includes('arcane'))
  )
}

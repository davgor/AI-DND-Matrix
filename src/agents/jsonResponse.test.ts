import { describe, expect, it } from 'vitest'
import { isValidGeneratedFactions } from './campaignGeneration/normalize'
import {
  generateJsonWithRetry,
  MAX_SCHEMA_ATTEMPTS,
  tryParseJson
} from './jsonResponse'
import { createScriptedProvider } from './providers/mockHarness'

/** Live Eldergloom dump: missing commas before deityName (campaign create 160). */
const LIVE_FACTIONS_MISSING_COMMAS = `{
    "factionPressure": "medium",
    "factionsSummary": "The Storm Priests control the winds, while the Temple Guilds hoard the secrets of the gods, and the Merchant's Alliance seeks to navigate the shifting tides of trade and power.",
    "factions": [
        {
            "key": "storm_priests",
            "name": "Storm Priests",
            "kind": "civic",
            "summary": "Worshippers of Aeloria who command the winds and weather."
        },
        {
            "key": "temple_guilds",
            "name": "Temple Guilds",
            "kind": "religious",
            "summary": "Guardians of the lost wisdom of Eldergloom, serving Vhalor and other forgotten deities."
            "deityName": "Vhalor"
        },
        {
            "key": "merchant_alliance",
            "name": "Merchant's Alliance",
            "kind": "mercantile",
            "summary": "A coalition of traders and merchants seeking to profit from the shifting seas."
        }
    ],
    "relations": [
        {
            "factionAKey": "storm_priests",
            "factionBKey": "temple_guilds",
            "stance": "tense",
            "summary": "Winds and secrets clash in a struggle for supremacy."
        },
        {
            "factionAKey": "storm_priests",
            "factionBKey": "merchant_alliance",
            "stance": "secret",
            "summary": "The Storm Priests secretly aid the Merchant's Alliance in their schemes."
        },
        {
            "factionAKey": "temple_guilds",
            "factionBKey": "merchant_alliance",
            "stance": "rival",
            "summary": "The Temple Guilds and Merchant's Alliance vie for control of the trade routes."
        }
    ]
}`

/** Live dump: two relations mashed into one object via duplicate keys (campaign create 160). */
const LIVE_FACTIONS_MASHED_RELATIONS =
  '{"factionPressure":"medium","factionsSummary":"Rival guilds of rune-casters vie for control over the mystical rivers, while storm priests seek to harness the winds to their will. Merchants and scholars navigate the shifting tides, hoping to gain favor and wealth from the myriad temples that dot the islands.","factions":[{"key":"rune_guild","name":"Rune-Guild of Eldergloom","kind":"mercantile","summary":"Guild of rune-casters who navigate the mystical rivers.","motivation":"Control over the mystical currents that shape Eldergloom’s landscape.","publicFace":"Scholars and traders who bring knowledge and goods from afar.","methods":"Rituals and incantations to manipulate the rivers.","sortOrder":0},{"key":"storm_priests","name":"Storm Priests of Rhosus","kind":"religious","summary":"Priests who command the winds and stormy seas.","deityName":"Rhosus","sortOrder":1},{"key":"merchant_consortium","name":"Merchant Consortium of Eldergloom","kind":"mercantile","summary":"Alliance of traders who navigate the shifting tides.","motivation":"Wealth and influence through commerce and exploration.","publicFace":"Harbor masters and captains who ensure safe passage through the waters.","methods":"Trade and diplomacy with various factions.","sortOrder":2},{"key":"ancient_temple","name":"Ancient Temple of Mara","kind":"religious","summary":"Temple dedicated to the goddess of life and fertility.","deityName":"Mara","sortOrder":3}],"relations":[{"factionAKey":"rune_guild","factionBKey":"storm_priests","stance":"tense","summary":"Rivalry over who controls the mystical currents and winds.","factionAKey":"merchant_consortium","factionBKey":"ancient_temple","stance":"ally","summary":"Traders support the temple in exchange for protection and blessings."}]}'

describe('tryParseJson', () => {
  it('parses plain JSON', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips a ```json ... ``` markdown code fence before parsing', () => {
    const raw = '```json\n{"a":1}\n```'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('strips a plain ``` ... ``` code fence with no language tag', () => {
    const raw = '```\n{"a":1}\n```'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('extracts a JSON object from surrounding prose', () => {
    const raw = 'Here is the campaign seed:\n{"a":1}\nHope that helps.'
    expect(tryParseJson(raw)).toEqual({ a: 1 })
  })

  it('returns undefined for genuinely malformed input', () => {
    expect(tryParseJson('not json at all')).toBeUndefined()
  })

  it('merges consecutive top-level JSON objects (local world split dump)', () => {
    const raw = [
      '{"worldName":"Aeloria","worldSummary":"Summary paragraph one. Summary paragraph two."}',
      '',
      '{"worldHistory":"History paragraph one. History paragraph two."}'
    ].join('\n')
    expect(tryParseJson(raw)).toEqual({
      worldName: 'Aeloria',
      worldSummary: 'Summary paragraph one. Summary paragraph two.',
      worldHistory: 'History paragraph one. History paragraph two.'
    })
  })

  it('keeps a single object when prose wraps one JSON blob', () => {
    const raw = 'Sure:\n{"worldName":"Tyria","worldSummary":"A.","worldHistory":"B."}\nDone.'
    expect(tryParseJson(raw)).toEqual({
      worldName: 'Tyria',
      worldSummary: 'A.',
      worldHistory: 'B.'
    })
  })

  it('repairs missing commas before the next property (live factions dump)', () => {
    const parsed = tryParseJson(LIVE_FACTIONS_MISSING_COMMAS) as {
      factions: Array<{ key: string; deityName?: string }>
    }
    expect(parsed?.factions?.find((f) => f.key === 'temple_guilds')?.deityName).toBe('Vhalor')
    expect(isValidGeneratedFactions(parsed, { deitiesPresent: true })).toBe(true)
  })

  it('splits mashed array objects when a duplicate key restarts a peer (live relations dump)', () => {
    const parsed = tryParseJson(LIVE_FACTIONS_MASHED_RELATIONS) as {
      relations: Array<{ factionAKey: string; factionBKey: string }>
    }
    expect(parsed?.relations).toHaveLength(2)
    expect(parsed.relations[0]).toMatchObject({
      factionAKey: 'rune_guild',
      factionBKey: 'storm_priests'
    })
    expect(parsed.relations[1]).toMatchObject({
      factionAKey: 'merchant_consortium',
      factionBKey: 'ancient_temple'
    })
    expect(isValidGeneratedFactions(parsed, { deitiesPresent: true })).toBe(true)
  })
})

describe('generateJsonWithRetry success paths', () => {
  it('returns the first successfully parsed value', async () => {
    const provider = createScriptedProvider(['not json', '{"ok":true}'])
    const result = await generateJsonWithRetry(
      provider,
      'prompt',
      (parsed) =>
        typeof parsed === 'object' && parsed !== null && 'ok' in parsed
          ? (parsed as { ok: boolean })
          : undefined
    )
    expect(result).toEqual({ ok: true })
    expect(provider.calls).toHaveLength(2)
  })

  it('passes optional generate context on every attempt', async () => {
    const provider = createScriptedProvider(['{"v":1}'])
    await generateJsonWithRetry(provider, 'p', (parsed) => parsed as { v: number }, {
      context: { maxTokens: 128 }
    })
    expect(provider.calls[0]?.context).toEqual({ maxTokens: 128 })
  })

  it('supports a prompt builder so each attempt can rebuild', async () => {
    const provider = createScriptedProvider(['{"n":1}'])
    let builds = 0
    await generateJsonWithRetry(
      provider,
      () => {
        builds += 1
        return `prompt-${builds}`
      },
      (parsed) => parsed as { n: number }
    )
    expect(builds).toBe(1)
    expect(provider.calls[0]?.prompt).toBe('prompt-1')
  })
})

describe('generateJsonWithRetry exhaustion', () => {
  it('uses fallback after MAX_SCHEMA_ATTEMPTS failures', async () => {
    const provider = createScriptedProvider(['x', 'y', 'z', 'w'])
    const result = await generateJsonWithRetry(provider, 'p', () => undefined, {
      fallback: () => ({ fallback: true })
    })
    expect(result).toEqual({ fallback: true })
    expect(provider.calls).toHaveLength(MAX_SCHEMA_ATTEMPTS)
  })

  it('throws exhaustedError when no fallback is provided', async () => {
    const provider = createScriptedProvider(['bad', 'bad', 'bad'])
    await expect(
      generateJsonWithRetry(provider, 'p', () => undefined, {
        exhaustedError: () => new Error('schema failed')
      })
    ).rejects.toThrow('schema failed')
  })
})

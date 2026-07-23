import { describe, expect, it } from 'vitest'
import { isValidGeneratedFactions } from './campaignGeneration/normalize'
import {
  generateJsonWithRetry,
  MAX_SCHEMA_ATTEMPTS,
  tryParseJson
} from './jsonResponse'
import { createScriptedProvider } from './providers/mockHarness'
import {
  LIVE_FACTIONS_MASHED_RELATIONS_JSON,
  LIVE_FACTIONS_MISSING_COMMAS_JSON
} from '../test/fixtures/liveFactionsJsonDumps'

describe('tryParseJson basics', () => {
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
})

describe('tryParseJson multi-object and repair', () => {
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
    const parsed = tryParseJson(LIVE_FACTIONS_MISSING_COMMAS_JSON) as {
      factions: Array<{ key: string; deityName?: string }>
    }
    expect(parsed?.factions?.find((f) => f.key === 'temple_guilds')?.deityName).toBe('Vhalor')
    expect(isValidGeneratedFactions(parsed, { deitiesPresent: true })).toBe(true)
  })

  it('splits mashed array objects when a duplicate key restarts a peer (live relations dump)', () => {
    const parsed = tryParseJson(LIVE_FACTIONS_MASHED_RELATIONS_JSON) as {
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

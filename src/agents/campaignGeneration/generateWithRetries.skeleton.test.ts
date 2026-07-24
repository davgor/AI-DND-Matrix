import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from '../providers/mockHarness'
import {
  CampaignGenerationSchemaError,
  generateWithRetries,
  MAX_GENERATION_ATTEMPTS,
  parseGenerationRaw
} from './index'

interface TinySeed {
  name: string
  summary: string
}

function normalizeTinySeed(parsed: unknown): TinySeed | undefined {
  if (!parsed || typeof parsed !== 'object') {
    return undefined
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.name !== 'string' || typeof record.summary !== 'string') {
    return undefined
  }
  if (!record.name.trim() || !record.summary.trim()) {
    return undefined
  }
  return { name: record.name.trim(), summary: record.summary.trim() }
}

function isValidTinySeed(value: TinySeed): boolean {
  return value.name.length > 0 && value.summary.length > 0
}

const TINY_SKELETON = '{"name":"{{NAME}}","summary":"{{SUMMARY}}"}'

const TINY_BLOCKS = [
  '<<<NAME>>>',
  'Ashmere',
  '<<</NAME>>>',
  '<<<SUMMARY>>>',
  'A quiet ossuary town.',
  '<<</SUMMARY>>>'
].join('\n')

describe('parseGenerationRaw (161.2)', () => {
  it('keeps JSON path behavior', () => {
    expect(parseGenerationRaw('{"a":1}', 'json')).toEqual({ a: 1 })
  })

  it('fills skeleton then JSON.parse', () => {
    expect(parseGenerationRaw(TINY_BLOCKS, 'skeleton', TINY_SKELETON)).toEqual({
      name: 'Ashmere',
      summary: 'A quiet ossuary town.'
    })
  })

  it('returns undefined when a skeleton block is missing', () => {
    const missing = ['<<<NAME>>>', 'Ashmere', '<<</NAME>>>'].join('\n')
    expect(parseGenerationRaw(missing, 'skeleton', TINY_SKELETON)).toBeUndefined()
  })

  it('falls back to a JSON object when skeleton fill fails (live regions dump)', () => {
    const jsonDump = JSON.stringify({
      regions: [{ name: 'Riverlands', description: 'Rivers converge.' }]
    })
    expect(parseGenerationRaw(jsonDump, 'skeleton', TINY_SKELETON)).toEqual({
      regions: [{ name: 'Riverlands', description: 'Rivers converge.' }]
    })
  })
})

describe('generateWithRetries skeleton success (161.2)', () => {
  it('succeeds with a scripted labeled-block response', async () => {
    const provider = createScriptedProvider([TINY_BLOCKS])
    const result = await generateWithRetries({
      provider,
      buildPrompt: () => 'fill the skeleton',
      buildSkeleton: () => TINY_SKELETON,
      parseMode: 'skeleton',
      maxTokens: 256,
      purpose: 'campaign.world',
      normalize: normalizeTinySeed,
      isValid: isValidTinySeed,
      errorMessage: 'tiny seed failed'
    })
    expect(result).toEqual({
      name: 'Ashmere',
      summary: 'A quiet ossuary town.'
    })
  })
})

describe('generateWithRetries skeleton failure (161.2)', () => {
  it('maps missing-block failures to unparseable schema attempts', async () => {
    const missing = ['<<<NAME>>>', 'Ashmere', '<<</NAME>>>'].join('\n')
    const provider = createScriptedProvider([missing, missing, missing])
    let caught: unknown
    try {
      await generateWithRetries({
        provider,
        buildPrompt: () => 'fill the skeleton',
        buildSkeleton: () => TINY_SKELETON,
        parseMode: 'skeleton',
        maxTokens: 256,
        purpose: 'campaign.world',
        normalize: normalizeTinySeed,
        isValid: isValidTinySeed,
        errorMessage: 'tiny seed failed'
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(CampaignGenerationSchemaError)
    const schemaError = caught as CampaignGenerationSchemaError
    expect(schemaError.failedAttempts).toHaveLength(MAX_GENERATION_ATTEMPTS)
    expect(schemaError.failedAttempts.every((entry) => entry.reason === 'unparseable')).toBe(
      true
    )
    expect(schemaError.failedAttempts[0]?.raw).toContain('<<<NAME>>>')
  })
})

describe('generateWithRetries JSON path unchanged (161.2)', () => {
  it('leaves default JSON path unchanged for unmigrated stages', async () => {
    const provider = createScriptedProvider([
      JSON.stringify({ name: 'JsonTown', summary: 'Still JSON.' })
    ])
    const result = await generateWithRetries({
      provider,
      buildPrompt: () => 'Respond ONLY with JSON',
      maxTokens: 256,
      purpose: 'campaign.world',
      normalize: normalizeTinySeed,
      isValid: isValidTinySeed,
      errorMessage: 'tiny seed failed'
    })
    expect(result).toEqual({ name: 'JsonTown', summary: 'Still JSON.' })
  })
})

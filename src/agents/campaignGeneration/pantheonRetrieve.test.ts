import { describe, expect, it } from 'vitest'
import { fillSkeletonFromValues } from '../skeletonFill'
import { buildPantheonSkeletonJson } from './pantheonSkeleton'
import { fillPantheonSkeleton, retrievePantheonFillValues } from './pantheonRetrieve'

const SUMMARY = 'Gods watch the marshes. Two names are lost to time.'

function expectDeity0(values: Record<string, string>): void {
  expect(values.DEITY_0_NAME).toBe('Aldorin')
  expect(values.DEITY_0_EPITHET).toBe('The Wind-Treader')
  expect(values.DEITY_0_DOMAINS).toBe('Storms, Sea, Knowledge')
  expect(values.DEITY_0_TENETS).toContain('Seek knowledge')
  expect(values.DEITY_0_BLURB).toContain('Aldorin is the deity')
}

describe('fillSkeletonFromValues', () => {
  it('loads retrieved strings into the pantheon skeleton', () => {
    const values: Record<string, string> = {
      PANTHEON_SUMMARY: SUMMARY
    }
    for (let index = 0; index < 10; index += 1) {
      values[`DEITY_${index}_NAME`] = `God${index}`
      values[`DEITY_${index}_EPITHET`] = index % 2 === 0 ? `Title${index}` : ''
      values[`DEITY_${index}_DOMAINS`] = 'storms, sea'
      values[`DEITY_${index}_TENETS`] = 'endure, protect, remember, share'
      values[`DEITY_${index}_BLURB`] = `Blurb for god ${index} with enough text.`
    }
    const filled = fillSkeletonFromValues(buildPantheonSkeletonJson(), values)
    expect(filled.ok).toBe(true)
    if (!filled.ok) {
      return
    }
    const parsed = JSON.parse(filled.jsonText) as {
      pantheonSummary: string
      deities: Array<{ name: string; isForgotten: boolean }>
    }
    expect(parsed.pantheonSummary).toBe(SUMMARY)
    expect(parsed.deities).toHaveLength(10)
    expect(parsed.deities[0]?.name).toBe('God0')
    expect(parsed.deities[8]?.isForgotten).toBe(true)
    expect(parsed.deities[9]?.isForgotten).toBe(true)
  })
})

describe('retrievePantheonFillValues composite DEITY_N blocks', () => {
  it('retrieves field strings from one block per deity', () => {
    const parts = [`<<<PANTHEON_SUMMARY>>>\n${SUMMARY}\n<<</PANTHEON_SUMMARY>>>`]
    for (let index = 0; index < 10; index += 1) {
      parts.push(
        [
          `<<<DEITY_${index}>>>`,
          `name: God${index}`,
          `epithet: Title${index}`,
          'domains: war, sea',
          'tenets: fight, sail, endure, share',
          `blurb: God${index} watches the coast through storm and calm.`,
          `<<</DEITY_${index}>>>`
        ].join('\n')
      )
    }
    const values = retrievePantheonFillValues(parts.join('\n'))
    expect(values).toBeDefined()
    expect(values?.PANTHEON_SUMMARY).toBe(SUMMARY)
    expect(values?.DEITY_3_NAME).toBe('God3')
    expect(values?.DEITY_3_DOMAINS).toBe('war, sea')
  })
})

function nestedFieldOpensDump(): string {
  const raw = [
    `<<<PANTHEON_SUMMARY>>>\n${SUMMARY}\n<<</PANTHEON_SUMMARY>>>`,
    '<<<DEITY_0_NAME>>>',
    'The Maker of Storms',
    '<<<DEITY_0_EPITHET>>>',
    'Nimble Thunder',
    '<<<DEITY_0_DOMAINS>>>',
    'storms, war, knowledge',
    '<<<DEITY_0_TENETS>>>',
    'forge wisdom, summon lightning, end with a strike, embrace fury',
    '<<<DEITY_0_BLURB>>>',
    'The Maker of Storms brings unpredictable wrath.',
    '<<</DEITY_0_NAME>>>'
  ]
  for (let index = 1; index < 10; index += 1) {
    raw.push(
      [
        `<<<DEITY_${index}_NAME>>>`,
        `God${index}`,
        `<<<DEITY_${index}_EPITHET>>>`,
        `Epithet${index}`,
        `<<<DEITY_${index}_DOMAINS>>>`,
        'harvest, hearth',
        `<<<DEITY_${index}_TENETS>>>`,
        'sow, reap, share, rest',
        `<<<DEITY_${index}_BLURB>>>`,
        `Blurb ${index} for the marsh pantheon.`,
        `<<</DEITY_${index}_NAME>>>`
      ].join('\n')
    )
  }
  return raw.join('\n')
}

function proseInsideNameDump(): string {
  const raw = [
    `<<<PANTHEON_SUMMARY>>>\n${SUMMARY}\n<<</PANTHEON_SUMMARY>>>`,
    '<<<DEITY_0_NAME>>>',
    'Aldorin',
    'Epithet: The Wind-Treader',
    'Domains: Storms, Sea, Knowledge',
    'Tenets: Seek knowledge, embrace change, navigate the storms, honor the sea',
    'Blurb: Aldorin is the deity of storms, the sea, and knowledge.',
    '<<</DEITY_0_NAME>>>'
  ]
  for (let index = 1; index < 10; index += 1) {
    raw.push(
      [
        `<<<DEITY_${index}_NAME>>>`,
        `God${index}`,
        `Epithet: Title${index}`,
        'Domains: war, death',
        'Tenets: stand, fight, endure, remember',
        `Blurb: God${index} holds a place in the roster.`,
        `<<</DEITY_${index}_NAME>>>`
      ].join('\n')
    )
  }
  return raw.join('\n')
}

describe('retrievePantheonFillValues nested field opens', () => {
  it('retrieves fields when opens nest inside DEITY_N_NAME without per-field closes', () => {
    const values = retrievePantheonFillValues(nestedFieldOpensDump())
    expect(values).toBeDefined()
    expect(values?.DEITY_0_NAME).toBe('The Maker of Storms')
    expect(values?.DEITY_0_EPITHET).toBe('Nimble Thunder')
    expect(values?.DEITY_0_DOMAINS).toBe('storms, war, knowledge')
    expect(values?.DEITY_0_BLURB).toContain('unpredictable wrath')
  })
})

describe('retrievePantheonFillValues prose stuffed in NAME', () => {
  it('retrieves fields from prose stuffed inside DEITY_N_NAME blocks', () => {
    const values = retrievePantheonFillValues(proseInsideNameDump())
    expect(values).toBeDefined()
    if (!values) {
      return
    }
    expectDeity0(values)
  })
})

function compositeClosedDump(): string {
  const parts = [`<<<PANTHEON_SUMMARY>>>\n${SUMMARY}\n<<</PANTHEON_SUMMARY>>>`]
  for (let index = 0; index < 10; index += 1) {
    parts.push(
      [
        `<<<DEITY_${index}>>>`,
        `name: God${index}`,
        'epithet: ',
        'domains: sea, trade',
        'tenets: sail, trade, honor, return',
        `blurb: God${index} keeps the harbor lamps lit through fog.`,
        `<<</DEITY_${index}>>>`
      ].join('\n')
    )
  }
  return parts.join('\n')
}

function compositeOmitClosesDump(): string {
  const parts = [`<<<PANTHEON_SUMMARY>>>\n${SUMMARY}`]
  for (let index = 0; index < 10; index += 1) {
    parts.push(
      [
        `<<<DEITY_${index}>>>`,
        `name: God${index}`,
        `epithet: Title${index}`,
        'domains: war, harvest, knowledge',
        'tenets: forge alliances, cultivate fields, learn from the past',
        `blurb: God${index} inspires miners and scholars in the colony.`
      ].join('\n')
    )
  }
  return parts.join('\n')
}

describe('fillPantheonSkeleton composite closed dump', () => {
  it('parses a composite dump into normalized-shaped JSON', () => {
    const filled = fillPantheonSkeleton(compositeClosedDump())
    expect(filled.ok).toBe(true)
    if (!filled.ok) {
      return
    }
    const parsed = JSON.parse(filled.jsonText) as { deities: Array<{ name: string }> }
    expect(parsed.deities[9]?.name).toBe('God9')
  })
})

describe('fillPantheonSkeleton omitted closing tags', () => {
  it('retrieves strings when the model omits all closing tags (live dump)', () => {
    const filled = fillPantheonSkeleton(compositeOmitClosesDump())
    expect(filled.ok).toBe(true)
    if (!filled.ok) {
      return
    }
    const parsed = JSON.parse(filled.jsonText) as {
      pantheonSummary: string
      deities: Array<{ name: string; epithet: string; tenets: string }>
    }
    expect(parsed.pantheonSummary).toBe(SUMMARY)
    expect(parsed.deities).toHaveLength(10)
    expect(parsed.deities[0]?.name).toBe('God0')
    expect(parsed.deities[9]?.name).toBe('God9')
    expect(parsed.deities[2]?.epithet).toBe('Title2')
  })
})

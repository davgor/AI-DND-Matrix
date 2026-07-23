import { describe, expect, it } from 'vitest'
import { extractLabeledBlocks, fillSkeleton, formatLabeledBlocks } from './skeletonFill'

describe('extractLabeledBlocks happy path', () => {
  it('extracts multiple labeled blocks from raw text', () => {
    const raw = [
      'Sure, here you go:',
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'A misty valley.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    expect(extractLabeledBlocks(raw)).toEqual({
      ok: true,
      values: {
        WORLD_NAME: 'Eldergloom',
        WORLD_SUMMARY: 'A misty valley.'
      }
    })
  })
})

describe('extractLabeledBlocks failures', () => {
  it('fails on unclosed tags', () => {
    const raw = '<<<WORLD_NAME>>>\nEldergloom\n'
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unclosed_tag')
      expect(result.token).toBe('WORLD_NAME')
    }
  })

  it('fails on mismatched close tags', () => {
    const raw = '<<<WORLD_NAME>>>\nEldergloom\n<<</WORLD_SUMMARY>>>'
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('malformed_tag')
    }
  })

  it('fails on duplicate tokens', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'A',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_NAME>>>',
      'B',
      '<<</WORLD_NAME>>>'
    ].join('\n')
    const result = extractLabeledBlocks(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('duplicate_token')
      expect(result.token).toBe('WORLD_NAME')
    }
  })
})

const WORLD_SKELETON = JSON.stringify({
  worldName: '{{WORLD_NAME}}',
  worldSummary: '{{WORLD_SUMMARY}}'
})

describe('fillSkeleton happy path', () => {
  it('fills all placeholders from labeled blocks', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Fog clings to the ridges.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Eldergloom',
      worldSummary: 'Fog clings to the ridges.'
    })
  })

  it('tolerates prose noise around tags', () => {
    const raw = [
      'Okay, filling the skeleton now.',
      '',
      '<<<WORLD_NAME>>>',
      'Tyria',
      '<<</WORLD_NAME>>>',
      'Some commentary the model adds.',
      '<<<WORLD_SUMMARY>>>',
      'A bright coast.',
      '<<</WORLD_SUMMARY>>>',
      'Done!'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'Tyria',
      worldSummary: 'A bright coast.'
    })
  })
})

describe('fillSkeleton repeated placeholders', () => {
  it('replaces every occurrence of a repeated placeholder', () => {
    const repeated = '{"a":"{{NAME}}","b":"{{NAME}}"}'
    const raw = ['<<<NAME>>>', 'Twin', '<<</NAME>>>'].join('\n')
    const result = fillSkeleton(repeated, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({ a: 'Twin', b: 'Twin' })
  })
})

describe('fillSkeleton failures', () => {
  it('fails when a required placeholder token is missing', () => {
    const raw = ['<<<WORLD_NAME>>>', 'Eldergloom', '<<</WORLD_NAME>>>'].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('missing_token')
      expect(result.token).toBe('WORLD_SUMMARY')
    }
  })

  it('fails on unknown tokens not present in the skeleton', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'Eldergloom',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Fog.',
      '<<</WORLD_SUMMARY>>>',
      '<<<EXTRA_FIELD>>>',
      'nope',
      '<<</EXTRA_FIELD>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unknown_token')
      expect(result.token).toBe('EXTRA_FIELD')
    }
  })

  it('fails on malformed or unclosed tags', () => {
    const unclosed = fillSkeleton(WORLD_SKELETON, '<<<WORLD_NAME>>>\nstuck')
    expect(unclosed.ok).toBe(false)
    if (!unclosed.ok) {
      expect(unclosed.reason).toBe('unclosed_tag')
    }
  })
})

describe('fillSkeleton escape policy', () => {
  it('JSON-escapes quotes and control chars so JSON.parse succeeds', () => {
    const raw = [
      '<<<WORLD_NAME>>>',
      'O\'Brien "the Bold"',
      '<<</WORLD_NAME>>>',
      '<<<WORLD_SUMMARY>>>',
      'Line one.\nLine two.\tTabbed.',
      '<<</WORLD_SUMMARY>>>'
    ].join('\n')
    const result = fillSkeleton(WORLD_SKELETON, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(() => JSON.parse(result.jsonText)).not.toThrow()
    expect(JSON.parse(result.jsonText)).toEqual({
      worldName: 'O\'Brien "the Bold"',
      worldSummary: 'Line one.\nLine two.\tTabbed.'
    })
  })

  it('inserts raw JSON fragments for {{@TOKEN}} placeholders', () => {
    const skeleton = '{"ok":{{@FLAG}},"items":{{@ITEMS}}}'
    const raw = formatLabeledBlocks({
      FLAG: 'true',
      ITEMS: '["a","b"]'
    })
    const result = fillSkeleton(skeleton, raw)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(JSON.parse(result.jsonText)).toEqual({ ok: true, items: ['a', 'b'] })
  })
})

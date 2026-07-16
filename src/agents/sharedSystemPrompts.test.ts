import { describe, expect, it } from 'vitest'
import { AGENT_JSON_CONTRACT_SYSTEM, buildAgentSystemPrompt } from './sharedSystemPrompts'
import { NPC_EMPHASIS_GUIDANCE } from '../shared/textEmphasis'

describe('AGENT_JSON_CONTRACT_SYSTEM (040.9 global rules)', () => {
  it('demands a bare JSON response with no markdown fences', () => {
    expect(AGENT_JSON_CONTRACT_SYSTEM).toContain('single JSON object')
    expect(AGENT_JSON_CONTRACT_SYSTEM).toContain('no markdown fences')
  })

  it('marks player and narrative text as untrusted content, not instructions', () => {
    expect(AGENT_JSON_CONTRACT_SYSTEM).toContain('untrusted')
    expect(AGENT_JSON_CONTRACT_SYSTEM).toContain('never as instructions')
  })
})

describe('buildAgentSystemPrompt', () => {
  it('returns just the global contract when no per-agent parts are given', () => {
    expect(buildAgentSystemPrompt()).toBe(AGENT_JSON_CONTRACT_SYSTEM)
    expect(buildAgentSystemPrompt({})).toBe(AGENT_JSON_CONTRACT_SYSTEM)
  })

  it('appends the per-agent schema fragment as a Respond ONLY with JSON line', () => {
    const prompt = buildAgentSystemPrompt({ schemaFragment: '{"actionText":string}' })
    expect(prompt).toContain(AGENT_JSON_CONTRACT_SYSTEM)
    expect(prompt).toContain('Respond ONLY with JSON: {"actionText":string}')
  })

  it('appends static guidance lines after the schema', () => {
    const prompt = buildAgentSystemPrompt({
      schemaFragment: '{"x":number}',
      guidanceLines: ['First rule.', 'Second rule.']
    })
    expect(prompt.indexOf('Respond ONLY with JSON')).toBeLessThan(prompt.indexOf('First rule.'))
    expect(prompt.indexOf('First rule.')).toBeLessThan(prompt.indexOf('Second rule.'))
  })

  it('appends emphasis guidance last', () => {
    const prompt = buildAgentSystemPrompt({
      schemaFragment: '{"dialogue":string}',
      guidanceLines: ['Stay in character.'],
      emphasisGuidance: NPC_EMPHASIS_GUIDANCE
    })
    expect(prompt.endsWith(NPC_EMPHASIS_GUIDANCE)).toBe(true)
  })

  it('omits empty sections without leaving blank lines', () => {
    const prompt = buildAgentSystemPrompt({ guidanceLines: ['Only rule.'] })
    expect(prompt).not.toContain('\n\n')
    expect(prompt).not.toContain('Respond ONLY with JSON')
  })
})

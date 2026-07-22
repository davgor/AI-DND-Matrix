import { describe, expect, it } from 'vitest'
import {
  buildSubjectOpinionPrompt,
  parseSubjectOpinionResponse
} from './subjectOpinionPrompt'

describe('subject opinion prompt', () => {
  it('labels subject and forbids inventing events', () => {
    const prompt = buildSubjectOpinionPrompt({
      holderName: 'Mira',
      holderRole: 'innkeeper',
      temperament: 'friendly',
      alignment: 'neutral_good',
      disposition: 'warm',
      canSpeak: true,
      subjectLabel: 'Captain Voss',
      subjectType: 'npc',
      memoriesJson: '["Saw the captain shout."]'
    })
    expect(prompt).toContain('Captain Voss')
    expect(prompt).toContain('holder only')
    expect(prompt).toContain('Do not invent events')
  })

  it('parses JSON stance responses and falls back for prose', () => {
    expect(parseSubjectOpinionResponse('{"summary":"Distrusts them.","stance":"wary"}')).toEqual({
      summary: 'Distrusts them.',
      stance: 'wary'
    })
    expect(parseSubjectOpinionResponse('Plain prose only.')).toEqual({
      summary: 'Plain prose only.',
      stance: 'unknown'
    })
    expect(parseSubjectOpinionResponse('')).toBeNull()
  })
})

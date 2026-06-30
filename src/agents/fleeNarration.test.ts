import { describe, expect, it } from 'vitest'
import { createScriptedProvider } from './providers/mockHarness'
import { judgeEscapeNarration, validateDmEscapeJudgment } from './fleeNarration'

const winningCheck = {
  playerRoll: 18,
  playerTotal: 22,
  hostileRoll: 8,
  hostileTotal: 10,
  success: true,
  margin: 12
}

describe('judgeEscapeNarration', () => {
  it('returns still_pursued on successful check', async () => {
    const result = await judgeEscapeNarration(
      createScriptedProvider([
        JSON.stringify({ outcome: 'still_pursued', narrationText: 'You gain ground but they follow.' })
      ]),
      {
        checkResult: winningCheck,
        regionDescription: 'A narrow alley',
        hostileSummary: 'Two goblins',
        repeatAttempt: false
      }
    )
    expect(result.outcome).toBe('still_pursued')
  })

  it('returns escaped when DM judges full clearance', async () => {
    const result = await judgeEscapeNarration(
      createScriptedProvider([
        JSON.stringify({ outcome: 'escaped', narrationText: 'You vanish into the crowd.' })
      ]),
      {
        checkResult: winningCheck,
        regionDescription: 'Market square',
        hostileSummary: 'One guard',
        repeatAttempt: true
      }
    )
    expect(result.outcome).toBe('escaped')
  })

  it('rejects calling judge on failed check', async () => {
    await expect(
      judgeEscapeNarration(createScriptedProvider([]), {
        checkResult: { ...winningCheck, success: false, margin: -2 },
        regionDescription: 'Room',
        hostileSummary: 'Goblin',
        repeatAttempt: false
      })
    ).rejects.toThrow(/successful disengage/)
  })
})

describe('validateDmEscapeJudgment server-side', () => {
  it('downgrades escaped to still_pursued when check failed', () => {
    expect(
      validateDmEscapeJudgment(
        { outcome: 'escaped', narrationText: 'Free at last.' },
        false
      ).outcome
    ).toBe('still_pursued')
  })
})

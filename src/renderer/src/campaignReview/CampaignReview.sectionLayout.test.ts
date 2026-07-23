import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CampaignReview lore section layout (153.5)', () => {
  it('places bestiary under factions and before story', () => {
    const source = readFileSync(join(__dirname, 'CampaignReview.tsx'), 'utf8')
    const factionsAt = source.indexOf('<CampaignReviewFactionsBlock')
    const bestiaryAt = source.indexOf('<CampaignReviewBestiarySection')
    const storyAt = source.indexOf('<CampaignReviewStory')
    expect(factionsAt).toBeGreaterThan(-1)
    expect(bestiaryAt).toBeGreaterThan(factionsAt)
    expect(storyAt).toBeGreaterThan(bestiaryAt)
  })

  it('divides pantheon, factions, bestiary, and story blocks', () => {
    const css = readFileSync(join(__dirname, 'campaignReview.css'), 'utf8')
    expect(css).toMatch(
      /\.campaign-review-pantheon,\s*\.campaign-review-factions,\s*\.campaign-review-bestiary,\s*\.campaign-review-story\s*\{[^}]*border-bottom:/s
    )
  })
})

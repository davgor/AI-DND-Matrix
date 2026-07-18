import { describe, expect, it } from 'vitest'
import type { RegionExtras } from '../../../main/campaignIpc'
import { CampaignReviewRegionExtras } from './CampaignReviewRegionExtras'
import { EditableFieldEditView, EditableFieldReadView } from './editableFieldViews'
import { RecapModalBody } from '../playView/RecapModalPanel'
import { hasEmphasisTypes } from '../test/formattedTextTestUtils'

describe('CampaignReviewRegionExtras emphasis rendering', () => {
  it('renders emphasis in backstory, recent history, and quest hooks', () => {
    const extras: RegionExtras = {
      regionId: 'r1',
      backstory: 'Founded in *ancient* times.',
      recentHistory: 'A **fire** swept the docks.',
      questHooks: ['Find the _lost_ relic']
    }

    const node = CampaignReviewRegionExtras({ extras })
    const sections = node.props.children as JSX.Element[]

    expect(hasEmphasisTypes(sections[0], ['em'])).toBe(true)
    expect(hasEmphasisTypes(sections[1], ['strong'])).toBe(true)
    expect(hasEmphasisTypes(sections[2], ['em'])).toBe(true)
  })
})

describe('EditableField emphasis rendering', () => {
  it('renders emphasis in read state and keeps raw markers in edit state', () => {
    const readNode = EditableFieldReadView({ value: 'A *quiet* village.' })
    expect(hasEmphasisTypes(readNode, ['em'])).toBe(true)

    const editNode = EditableFieldEditView({ value: 'A *quiet* village.', onChange: () => {} })
    expect(editNode.props.value).toBe('A *quiet* village.')
  })
})

describe('RecapModalBody emphasis rendering', () => {
  it('renders emphasis markers in recap text', () => {
    const recapParagraph = RecapModalBody({
      loading: false,
      text: 'Previously you *escaped* the **keep**.'
    })
    expect(hasEmphasisTypes(recapParagraph, ['em', 'strong'])).toBe(true)
  })
})

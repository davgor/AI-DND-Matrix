import { describe, expect, it } from 'vitest'
import {
  findDisallowedDefaultTropes,
  meetsPremiseTropeDiversity,
  meetsRegionTropeDiversity,
  meetsWorldTropeDiversity
} from './tropeGuard'
import { makeRegion } from './fixtures'

describe('tropeGuard', () => {
  it('flags kraken and ziggurat when the premise does not ask for them', () => {
    const prose = 'A kraken sank the last convoy near a crumbling ziggurat.'
    expect(findDisallowedDefaultTropes(prose, 'A feud between mining guilds')).toEqual([
      'kraken',
      'ziggurat'
    ])
    expect(meetsPremiseTropeDiversity(prose, 'A feud between mining guilds')).toBe(false)
  })

  it('allows tropes when the premise explicitly calls for them', () => {
    expect(
      meetsPremiseTropeDiversity('The kraken still owns the harbor.', 'Hunt the kraken that sank our fleet')
    ).toBe(true)
    expect(
      meetsPremiseTropeDiversity('Priests meet atop the ziggurat.', 'Restore the old ziggurat cult')
    ).toBe(true)
  })

  it('checks combined world and region prose', () => {
    const world = {
      worldName: 'Eryndor',
      worldSummary: 'Border wars choke the mountain passes.',
      worldHistory: 'A kraken legend is told in every port tavern.'
    }
    expect(meetsWorldTropeDiversity(world, 'A quiet farming valley')).toBe(false)

    const region = makeRegion('Ashford Vale', 'farmland')
    region.recentHistory = 'Farmers found carved steps like a ziggurat in the field.'
    expect(meetsRegionTropeDiversity(region, 'Harvest festival politics')).toBe(false)
  })
})

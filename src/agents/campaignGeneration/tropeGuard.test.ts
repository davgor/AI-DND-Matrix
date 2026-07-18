import { describe, expect, it } from 'vitest'
import {
  findDisallowedDefaultTropes,
  meetsPremiseTropeDiversity,
  meetsRegionTropeDiversity,
  meetsWorldTropeDiversity
} from './tropeGuard'
import { makeRegion } from '../../test/fixtures/campaignGenerationFixtures'

const PREMISE = 'Mercenaries arrive in a river kingdom as drowned ruins surface.'

/** Last summary para + first history para each stay under hyphen budget alone. */
const BOUNDARY_WORLD = {
  worldName: 'Calderin',
  worldSummary: [
    'Calderin is a river kingdom of silt farms and barge markets. Flood marks climb every quay wall after the spring melt.',
    'Harbor towns tax the same moorings twice while storm-priests argue over wreck rights. Farmers watch refugee columns pass on the coastal roads each autumn.',
    'Power is fragmented today while storm-priests still shape harbor politics. Beacon-fires mark the outer reefs after dusk whenever free captains claim legitimacy.'
  ].join('\n\n'),
  worldHistory: [
    'Three ages ago salvage-rights disputes drowned the old river courts. Temples rang warning bells for weeks, but the flood still climbed through harbor streets faster than any evacuation plan. Survivors who reached high ground rebuilt as cliff clans who still measure wealth in rope and fresh water.',
    'Salvagers still dredge barnacled crowns and drowned libraries from the inner bays. Scholars argue whether the flood was natural, divine punishment, or sabotage between rival archmages, and every court commissions a different answer. Dredging licenses have become the fastest path to a noble title in port cities.',
    'For two centuries the Charting Compact mapped safe passages and taxed moorings until guild wars broke the tithe system. Captains who remembered the old routes became kings of smuggling lanes overnight. The Compact seal houses are ruins now, but their ledgers still surface in wreck sales.',
    'In the last generation explorer crews have pushed past the outer shoals again, returning with cursed ore, missing manifests, and rumors of living reefs that remember every ship that wronged them. Few crews return with the same crew count they left with. Insurance brokers on the inner quay have doubled their rates twice in five years.',
    'Today the inner sea routes are contested again by smuggler princes and captains who swear the drowned still vote on every treaty. Festival markets flourish beside famine roads, and everyone knows the next squall may rewrite the map. Beacon chains are relit one tower at a time, always too late for someone.'
  ].join('\n\n')
}

const BOUNDARY_REGION_DESCRIPTION = [
  'A storm-battered harbor clings to black cliffs. Salt warehouses and net menders define daily life.',
  'At night captains argue over charts while storm-priests mark the tide. Beacon-fires answer from the outer reef.'
].join('\n\n')

const BOUNDARY_REGION_HISTORY =
  'Salvage-rights wars raised the docks after the last age of sail. Rival companies fought quietly over mooring rights until shipmasters formalized the tithe.'

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

  it('does not false-reject when hyphen compounds sit on either side of a field boundary', () => {
    expect(meetsPremiseTropeDiversity(BOUNDARY_WORLD.worldSummary, PREMISE)).toBe(true)
    expect(meetsPremiseTropeDiversity(BOUNDARY_WORLD.worldHistory, PREMISE)).toBe(true)
    expect(meetsWorldTropeDiversity(BOUNDARY_WORLD, PREMISE)).toBe(true)

    const region = makeRegion('Tidemark Reach', 'harbor')
    region.description = BOUNDARY_REGION_DESCRIPTION
    region.historyBackstory = BOUNDARY_REGION_HISTORY
    expect(meetsPremiseTropeDiversity(region.description, PREMISE)).toBe(true)
    expect(meetsPremiseTropeDiversity(region.historyBackstory, PREMISE)).toBe(true)
    expect(meetsRegionTropeDiversity(region, PREMISE)).toBe(true)
  })
})

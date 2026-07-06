import type { BackgroundRosterEntry } from '../../shared/characterBackground/types'

export const BACKGROUND_ROSTER: BackgroundRosterEntry[] = [
  {
    key: 'acolyte',
    label: 'Acolyte',
    description:
      'Raised in the service of a temple, you spent your years performing rites, tending shrines, and studying doctrine. Faith — kept or broken — shaped who you are.'
  },
  {
    key: 'charlatan',
    label: 'Charlatan',
    description:
      "You've always had a silver tongue and a false identity or two. Cons, forgeries, and quick exits paid your way through life."
  },
  {
    key: 'criminal',
    label: 'Criminal',
    description:
      'You made your living outside the law — burglary, smuggling, or worse — and you still know the people and places polite society pretends not to.'
  },
  {
    key: 'street_thug',
    label: 'Street Thug',
    description:
      "You grew up enforcing someone else's will in back alleys, collecting debts and cracking heads. Muscle was your trade, and the streets were your school."
  },
  {
    key: 'entertainer',
    label: 'Entertainer',
    description:
      'Stages, taverns, and street corners were your home. You lived to perform — music, story, dance — and learned to read a crowd like a book.'
  },
  {
    key: 'folk_hero',
    label: 'Folk Hero',
    description:
      'You stood up when it mattered — against a tyrant, a monster, or a disaster — and the common folk still tell the story. Their hopes travel with you.'
  },
  {
    key: 'guild_artisan',
    label: 'Guild Artisan',
    description:
      'You apprenticed in a craft — smithing, brewing, weaving — and earned your place in a guild. Your hands know honest work and your name carries weight among tradesfolk.'
  },
  {
    key: 'hermit',
    label: 'Hermit',
    description:
      "You withdrew from society — to a shrine, a cave, a distant cell — in search of answers or escape. Solitude gave you insight the world hasn't heard yet."
  },
  {
    key: 'noble',
    label: 'Noble',
    description:
      'Born to title, land, or old money, you were raised with privilege, expectation, and the weight of a family name — whether you carry it proudly or fled from it.'
  },
  {
    key: 'outlander',
    label: 'Outlander',
    description:
      'You come from the wilds far beyond city walls — a wanderer, forager, or tribal exile. Civilization is the foreign country; the wilderness is home.'
  },
  {
    key: 'sage',
    label: 'Sage',
    description:
      'You spent years among books, scrolls, and scholars, chasing knowledge. There are questions you can answer that no one else in the room can.'
  },
  {
    key: 'sailor',
    label: 'Sailor',
    description:
      'Years before the mast taught you rigging, weather, ports, and the kind of trouble found in each. The sea left its mark on you.'
  },
  {
    key: 'soldier',
    label: 'Soldier',
    description:
      'You served in an army or militia — drilled, marched, and fought. Discipline, rank, and old comrades (or old enemies) follow you still.'
  },
  {
    key: 'urchin',
    label: 'Urchin',
    description:
      'You grew up orphaned and poor on hard city streets, surviving on wit, speed, and knowing every rooftop and sewer grate no one else notices.'
  },
  {
    key: 'merchant',
    label: 'Merchant',
    description:
      "You lived by the ledger and the caravan — buying, selling, haggling, and reading people's wants. Coin and contacts were your craft."
  },
  {
    key: 'farmhand',
    label: 'Farmhand',
    description:
      'You were raised on soil and seasons — planting, harvesting, tending animals. Plain, honest work built your strength and your patience.'
  },
  {
    key: 'isekaid',
    label: "Isekai'd",
    description:
      'You are not from this world at all. You woke here — pulled from another life entirely — with memories of a place no one here has heard of and no idea how, or why, you crossed over.'
  }
]

export function findBackgroundRosterEntry(backgroundKey: string): BackgroundRosterEntry | undefined {
  return BACKGROUND_ROSTER.find((entry) => entry.key === backgroundKey)
}

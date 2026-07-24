/**
 * Live llama.cpp region dumps that failed campaign create (ticket 168).
 * Kept as builders so describe/it callbacks stay under oxlint max-lines.
 */

export function liveRegionsEmptyRemapDump(): string {
  return [
    '<<<REGION_0_NAME>>>',
    'Flooded Marshes',
    '<<</REGION_0_NAME>>>',
    '<<<REGION_0_DESCRIPTION>>>',
    'The Flooded Marshes stretch for miles, a labyrinth of shallow waters and reeds that shift with the river\'s whims. The ground beneath the water is treacherous, dotted with old ruins and the bones of forgotten creatures. The air is thick with the scent of decaying vegetation, and the cries of waterfowl echo through the mist. Visitors often find themselves disoriented, the marshes seeming to change as they approach. The people here, known as the Riverfolk, navigate these waters in long, shallow boats, their lives tied to the river\'s unpredictable flow.',
    '<<</REGION_0_DESCRIPTION>>>',
    '<<<REGION_0_QUEST_0>>>',
    'Retrieve a sacred artifact from a recently uncovered temple.',
    '<<</REGION_0_QUEST_0>>>',
    '<<<REGION_0_QUEST_1>>>',
    'Map out the shifting riverbed to predict its future course.',
    '<<</REGION_0_QUEST_1>>>',
    '<<<REGION_0_HISTORY_BACKSTORIY>>>',
    'The Flooded Marshes were once part of the ancient city of Eldara, a center of learning and trade. The people revered Kaela, the deity of the harvest, who promised bountiful crops in exchange for devotion. However, the river\'s course began to shift unpredictably, and as the land flooded, the temple of Eldara was submerged, its knowledge lost to time. In recent centuries, the river\'s flow has become even more erratic, exposing old ruins and leading to frequent conflicts over resources.',
    '<<</REGION_0_HISTORY_BACKSTORIY>>>',
    '<<<REGION_0_RECENT_HISTORY>>>',
    'In the last decade, the river has shifted dramatically, uncovering the ancient ruins of Eldara and leading to a surge in both wonder and fear among the Riverfolk. Temples now compete for influence, and the people must navigate the shifting alliances to survive. The rediscovery of Eldara\'s lost knowledge has sparked a race to uncover its secrets, which could either bring prosperity or destruction to Mistmarsh.',
    '<<</REGION_0_RECENT_HISTORY>>>',
    '<<<REGION_0_NAME>>>',
    '<<</REGION_0_NAME>>>',
    '<<<REGION_1_NAME>>>',
    'Ruined Cities',
    '<<</REGION_1_NAME>>>',
    '<<<REGION_1_DESCRIPTION>>>',
    'The Ruined Cities stand as silent sentinels along the banks of the river, their crumbling structures a testament to the past. Abandoned for centuries, they now lie exposed, their stone walls weathered by time and the elements. Visitors often find themselves walking through ancient halls, their minds filled with the whispers of long-forgotten gods. The air here is heavy with the scent of damp stone and the distant echo of wind through the ruins. The people who dare to explore these cities face not only the dangers of the shifting river but also the malevolent spirits said to haunt the ruins.',
    '<<</REGION_1_DESCRIPTION>>>',
    '<<<REGION_1_QUEST_0>>>',
    'Exorcise the spirits from an ancient temple.',
    '<<</REGION_1_QUEST_0>>>',
    '<<<REGION_1_QUEST_1>>>',
    'Uncover the hidden chambers in a forgotten city to find a lost artifact.',
    '<<</REGION_1_QUEST_1>>>',
    '<<<REGION_1_HISTORY_BACKSTORIY>>>',
    'The Ruined Cities were once the heart of the ancient civilization of Morn, a place of great learning and power. Morn, the god of knowledge, was said to have hidden a vast library within the city\'s heart. However, a great flood destroyed the city, and Morn\'s power waned. The ruins remained, forgotten until the river shifted, uncovering them once more. Now, the ruins are both a source of wonder and a place of dread, as the spirits of the past seek to reclaim their lost domain.',
    '<<</REGION_1_HISTORY_BACKSTORIY>>>',
    '<<<REGION_1_RECENT_HISTORY>>>',
    'Recently, the river has exposed new sections of the Ruined Cities, bringing both excitement and fear to the people of Mistmarsh. The rediscovery of Morn\'s lost knowledge has sparked a race among the temples to uncover the hidden chambers and gain the power they once held. However, the malevolent spirits of the past have become more active, threatening those who dare to explore the ruins.',
    '<<</REGION_1_RECENT_HISTORY>>>'
  ].join('\n')
}

/** Attempt-3 shape: two hyphen compounds in one recent-history sentence (once-vibrant + half-submerged). */
export function liveRegionsDualHyphenRecentHistory(): string {
  return [
    'Recently, the river has been acting even more unpredictably, with sudden rises and drops in water levels, causing widespread famine and displacement.',
    'The temples that once stood here, aligned with Eldara and Morn, are now overgrown and crumbling, their once-vibrant statues now half-submerged.'
  ].join(' ')
}

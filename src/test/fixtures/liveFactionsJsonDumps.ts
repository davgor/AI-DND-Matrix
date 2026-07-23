/** Live Eldergloom dump: missing commas before deityName (campaign create 160). */
export const LIVE_FACTIONS_MISSING_COMMAS_JSON = `{
    "factionPressure": "medium",
    "factionsSummary": "The Storm Priests control the winds, while the Temple Guilds hoard the secrets of the gods, and the Merchant's Alliance seeks to navigate the shifting tides of trade and power.",
    "factions": [
        {
            "key": "storm_priests",
            "name": "Storm Priests",
            "kind": "civic",
            "summary": "Worshippers of Aeloria who command the winds and weather."
        },
        {
            "key": "temple_guilds",
            "name": "Temple Guilds",
            "kind": "religious",
            "summary": "Guardians of the lost wisdom of Eldergloom, serving Vhalor and other forgotten deities."
            "deityName": "Vhalor"
        },
        {
            "key": "merchant_alliance",
            "name": "Merchant's Alliance",
            "kind": "mercantile",
            "summary": "A coalition of traders and merchants seeking to profit from the shifting seas."
        }
    ],
    "relations": [
        {
            "factionAKey": "storm_priests",
            "factionBKey": "temple_guilds",
            "stance": "tense",
            "summary": "Winds and secrets clash in a struggle for supremacy."
        },
        {
            "factionAKey": "storm_priests",
            "factionBKey": "merchant_alliance",
            "stance": "secret",
            "summary": "The Storm Priests secretly aid the Merchant's Alliance in their schemes."
        },
        {
            "factionAKey": "temple_guilds",
            "factionBKey": "merchant_alliance",
            "stance": "rival",
            "summary": "The Temple Guilds and Merchant's Alliance vie for control of the trade routes."
        }
    ]
}`

/** Live dump: two relations mashed into one object via duplicate keys (campaign create 160). */
export const LIVE_FACTIONS_MASHED_RELATIONS_JSON =
  '{"factionPressure":"medium","factionsSummary":"Rival guilds of rune-casters vie for control over the mystical rivers, while storm priests seek to harness the winds to their will. Merchants and scholars navigate the shifting tides, hoping to gain favor and wealth from the myriad temples that dot the islands.","factions":[{"key":"rune_guild","name":"Rune-Guild of Eldergloom","kind":"mercantile","summary":"Guild of rune-casters who navigate the mystical rivers.","motivation":"Control over the mystical currents that shape Eldergloom’s landscape.","publicFace":"Scholars and traders who bring knowledge and goods from afar.","methods":"Rituals and incantations to manipulate the rivers.","sortOrder":0},{"key":"storm_priests","name":"Storm Priests of Rhosus","kind":"religious","summary":"Priests who command the winds and stormy seas.","deityName":"Rhosus","sortOrder":1},{"key":"merchant_consortium","name":"Merchant Consortium of Eldergloom","kind":"mercantile","summary":"Alliance of traders who navigate the shifting tides.","motivation":"Wealth and influence through commerce and exploration.","publicFace":"Harbor masters and captains who ensure safe passage through the waters.","methods":"Trade and diplomacy with various factions.","sortOrder":2},{"key":"ancient_temple","name":"Ancient Temple of Mara","kind":"religious","summary":"Temple dedicated to the goddess of life and fertility.","deityName":"Mara","sortOrder":3}],"relations":[{"factionAKey":"rune_guild","factionBKey":"storm_priests","stance":"tense","summary":"Rivalry over who controls the mystical currents and winds.","factionAKey":"merchant_consortium","factionBKey":"ancient_temple","stance":"ally","summary":"Traders support the temple in exchange for protection and blessings."}]}'

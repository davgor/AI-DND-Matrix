# EPIC: Narrative text emphasis formatting

Make the game accept and render common inline emphasis markers — `*italic*`/`_italic_` and `**bold**`/`__bold__` — anywhere DM/agent-authored narrative text reaches the player, instead of showing the raw asterisks/underscores. Today almost every narrative surface (in-play scene narration, the character journal, the log book, campaign review text, the session recap banner) renders its text field as a raw string with no parsing at all.

This is distinct from the existing `reactionKind`-driven bold/action rendering added in ticket 028.7: that mechanism renders an entire NPC line as bold or italic based on a structured `dialogue`/`action` field set by the agent, and strips a single pair of outer `**` markers as part of that — it does not parse inline emphasis inside arbitrary text. This epic adds a general-purpose inline parser/renderer that coexists with it (an NPC action line can still itself contain `*nested*` emphasis) and extends emphasis rendering to every other narrative surface that currently has none.

Broken down into sub-tickets 030.1-030.7. This epic is done when all of them are.

030.1 emphasis parser spec + shared tokenizer · 030.2 FormattedText renderer component · 030.3 wire into in-play narration (DmExpositionPanel) · 030.4 wire into character journal + log book sections · 030.5 wire into campaign review text + session recap banner · 030.6 DM/NPC agent prompt guidance on emphasis convention · 030.7 end-to-end smoke test across all rendering surfaces

export const NARRATIVE_EMPHASIS_GUIDANCE = [
  'Text emphasis markers (rendered inline for the player): use *italic* or _italic_ for tone, asides, or soft emphasis;',
  'use **bold** or __bold__ for strong emphasis or forceful/shouted lines.',
  'Do not use emphasis markers for machine-parsed structure — keep JSON field names and reactionKind separate;',
  'emphasis belongs in player-facing narrative strings only (narrationText, dialogue, actionDescription, journalEntry, log book content, etc.).'
].join(' ')

export const NPC_EMPHASIS_GUIDANCE = [
  NARRATIVE_EMPHASIS_GUIDANCE,
  'The reactionKind field (dialogue vs action) controls outer italic/bold styling — inline markers add emphasis inside that text, not instead of it.'
].join(' ')

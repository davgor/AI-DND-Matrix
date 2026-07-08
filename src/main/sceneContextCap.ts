// === 040.5: within-turn scene-context cap ====================================
// `BeatExecutionState.sceneContextBeats` accumulates one entry per beat that
// produced scene text (narration, player action expression, inactive-player
// actions appended back in). Downstream agent prompts (NPC reactions, party
// members, inactive players) only ever need the freshest slice of that scene,
// so prompt-building caps to the last SCENE_CONTEXT_MAX_BEATS beats and at
// most SCENE_CONTEXT_MAX_CHARS trailing characters.
//
// The cap applies at PROMPT-BUILD time only. The accumulating state is never
// truncated: the inactive-player loop appends actions back into it, and
// truncating state would drop earlier beats from later same-turn prompts.

export const SCENE_CONTEXT_MAX_BEATS = 2
export const SCENE_CONTEXT_MAX_CHARS = 1500

export function capSceneContextForPrompt(beats: readonly string[]): string {
  const joined = beats.slice(-SCENE_CONTEXT_MAX_BEATS).join(' ')
  // Keep the tail — the most recent beat text is what agents react to.
  return joined.length > SCENE_CONTEXT_MAX_CHARS ? joined.slice(-SCENE_CONTEXT_MAX_CHARS) : joined
}

# EPIC: Narrative text emphasis formatting

Make the game accept and render common inline emphasis markers — `*italic*`/`_italic_` and `**bold**`/`__bold__` — anywhere DM/agent-authored narrative text reaches the player, instead of showing the raw asterisks/underscores. Today almost every narrative surface (in-play scene narration, the character journal, the log book, campaign review text, the session recap banner) renders its text field as a raw string with no parsing at all.

This is distinct from the existing `reactionKind`-driven bold/action rendering added in ticket 028.7: that mechanism renders an entire NPC line as bold or italic based on a structured `dialogue`/`action` field set by the agent, and strips a single pair of outer `**` markers as part of that — it does not parse inline emphasis inside arbitrary text. This epic adds a general-purpose inline parser/renderer that coexists with it (an NPC action line can still itself contain `*nested*` emphasis) and extends emphasis rendering to every other narrative surface that currently has none.

Broken down into sub-tickets 030.1-030.7. This epic is done when all of them are.

030.1 emphasis parser spec + shared tokenizer · 030.2 FormattedText renderer component · 030.3 wire into in-play narration (DmExpositionPanel) · 030.4 wire into character journal + log book sections · 030.5 wire into campaign review text + session recap banner · 030.6 DM/NPC agent prompt guidance on emphasis convention · 030.7 end-to-end smoke test across all rendering surfaces

## Sub-tickets

### 030.1 Emphasis parser spec + shared tokenizer

#### Description
Add a pure, framework-free tokenizer that turns a string containing `*italic*`, `_italic_`, `**bold**`, and `__bold__` markers into a sequence of `{ type: 'text' | 'em' | 'strong', content: string }` tokens, so it can be unit-tested without React and reused by both the renderer and any future non-React surface. Lives under `src/shared` (e.g. `src/shared/textEmphasis/`) since it's plain TS with no DOM/React dependency, matching this repo's existing `/src/shared` module organization.

#### Acceptance Criteria
- [x] Tokenizer correctly handles `*...*`, `_..._`, `**...**`, and `__...__`, including multiple emphasis spans in one string
- [x] Unmatched or malformed markers (e.g. a stray `*` with no closing partner) fall back to literal text rather than throwing or eating content
- [x] A literal asterisk/underscore can be escaped (`\*`) and renders as the literal character, not a marker
- [x] Nested emphasis (`**bold with *italic* inside**`) is explicitly out of scope for v1 and is documented as rendering the outer span only, with inner markers left as literal text
- [x] Unit tests cover plain text, single-span, multi-span, escaping, and malformed-marker cases

### 030.2 FormattedText renderer component

#### Description
Add a small renderer-only React component (e.g. `src/renderer/src/shared/FormattedText.tsx`) that consumes the tokenizer from 030.1 and maps tokens to `<em>`/`<strong>`/plain text React nodes — no `dangerouslySetInnerHTML`, since tokens are rendered as React children, not raw HTML. This is the single integration point every other sub-ticket in this epic wires into.

#### Acceptance Criteria
- [x] `<FormattedText text={...} />` renders plain text unchanged when there are no emphasis markers
- [x] Renders `*x*`/`_x_` as `<em>` and `**x**`/`__x__` as `<strong>`, with no literal marker characters visible in the rendered output
- [x] Accepts an optional wrapping element/className prop so call sites can still control block-level layout (e.g. keep rendering inside a `<p>`)
- [x] Component tests cover the no-markup, single-span, and multi-span cases using the existing renderer test conventions

### 030.3 Wire into in-play narration (DmExpositionPanel)

#### Description
Apply `FormattedText` to the scene narration text in `DmExpositionPanel` (currently `<p className="dm-exposition-scene-text">{sceneText}</p>`, raw string, no parsing). Leave the existing `reactionKind`-driven NPC dialogue/action rendering (`dmExpositionParts.tsx`, ticket 028.7) as-is structurally, but run its inner text through `FormattedText` too, so an NPC action line can itself contain inline `*emphasis*` without showing raw markers alongside the outer bold/italic wrapper.

#### Acceptance Criteria
- [x] DM scene narration renders `*`/`_`/`**`/`__` markers as styled emphasis, not literal characters
- [x] NPC dialogue/action lines (028.7's `reactionKind` path) still render their outer bold/italic correctly, and any inline emphasis inside that text also renders correctly rather than showing raw markers
- [x] Existing `DmExpositionPanel` tests for the alignment-shift warning banner and dialogue/action rendering still pass unmodified in intent (updated only for the new nested rendering, not behavior changes)
- [x] New tests cover scene text containing emphasis markers

### 030.4 Wire into character journal + log book sections

#### Description
Apply `FormattedText` to `CharacterJournalSection` (`<p>{entry.content}</p>`) and `CharacterLogBookSections` (`<p>{entry.content}</p>`) on the character sheet, so journal diary entries and log book entries render emphasis instead of raw markers.

#### Acceptance Criteria
- [x] Journal entries render emphasis markers as styled text
- [x] Log book entries (all five categories) render emphasis markers as styled text
- [x] Empty-state rendering for both sections is unaffected
- [x] Component tests cover at least one entry containing emphasis markers in each section

### 030.5 Wire into campaign review text + session recap banner

#### Description
Apply `FormattedText` to the remaining raw narrative text surfaces: `CampaignReviewRegionExtras` (backstory, recent history, quest hooks), the campaign review NPC disposition text rendered via `EditableField`, and `RecapBanner`'s recap text.

#### Acceptance Criteria
- [x] Region backstory, recent history, and quest hooks render emphasis markers as styled text in campaign review
- [x] `EditableField`'s read (non-editing) state renders emphasis markers as styled text; the editing textarea continues to show raw markers as plain editable text
- [x] Session recap banner text renders emphasis markers as styled text
- [x] Component tests cover each surface with an emphasis-bearing fixture

### 030.6 DM/NPC agent prompt guidance on emphasis convention

#### Description
Update the DM and NPC agent prompt-building functions (`src/agents/dm.ts`, `src/agents/npc.ts`) to explicitly document the supported emphasis convention (`*italic*`/`_italic_` for tone/asides, `**bold**`/`__bold__` for emphasis or shouted/forceful lines) so agents use it deliberately and consistently, rather than emphasis only showing up by accident.

#### Acceptance Criteria
- [x] DM narration prompt includes brief guidance on when/how to use `*`/`_` and `**`/`__` markers
- [x] NPC reaction prompt includes the same guidance for dialogue/action text, noted as compatible with (not a replacement for) the existing `reactionKind` field
- [x] Prompt-building unit tests assert the guidance text is present in the built prompt
- [x] Guidance explicitly tells the agent not to use emphasis markers for anything that should be machine-parsed elsewhere (e.g. it doesn't conflict with `reactionKind` or structured JSON fields)

### 030.7 End-to-end emphasis formatting smoke test

#### Description
Run end-to-end validation that emphasis markers entered or generated anywhere in the narrative pipeline render correctly everywhere, and that nothing regresses the existing 028.7 structured bold/italic behavior.

#### Acceptance Criteria
- [x] Smoke run confirms a DM narration response containing emphasis markers renders correctly in the in-play exposition panel
- [x] Smoke run confirms journal, log book, campaign review, and recap surfaces all render emphasis markers correctly (no raw markers visible in any)
- [x] Smoke run confirms 028.7's NPC `reactionKind` dialogue/action rendering is unchanged where the underlying text has no inline emphasis
- [x] Build/test/lint baseline remains green after the formatter is wired into every surface

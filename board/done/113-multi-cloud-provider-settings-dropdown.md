# EPIC: Multi-cloud provider settings — Claude, GPT, Gemini, Grok (+ local)

Expand Settings so players can choose among major cloud LLM vendors and pick a concrete model, instead of the current radio list of Claude / llama.cpp / Player2 only.

Today (`016`): provider mode is three radios (`claude` | `llamacpp` | `player2`); only Claude has an API-key cloud path. This epic adds **OpenAI (GPT)**, **Google (Gemini)**, and **xAI (Grok)** as first-class cloud providers, replaces the radio group with a **dropdown**, and lets the user select **which model** that provider should use (curated list + optional custom model id where safe).

Local options (**Player2**, **llama.cpp** / epic **020**) remain available in the same dropdown.

## UX target

```
Settings → Provider
  [ Provider ▾ ]   Claude | GPT (OpenAI) | Gemini | Grok (xAI) | Player2 | Local llama.cpp
        │
        ├─ cloud: API key (masked) + [ Model ▾ ] (+ optional custom model id)
        ├─ Player2: base URL + Test connection
        └─ llama.cpp: existing local fields (020)
  [Test connection]  [Cancel] [Save]
```

## Product decisions (v1)

| # | Decision |
|---|----------|
| 1 | **One active provider for the whole app** (same as today). Per-agent mix-and-match (DM vs NPC vs campaign gen) is **out of scope** — candidate follow-up after **112** metering. |
| 2 | **Dropdown** replaces radios for provider selection (scales as vendors grow). |
| 3 | **Model picker** is required for each cloud provider: curated defaults + allow custom model string for power users. |
| 4 | **Secrets** stay main-process only; redacted UI parity with Claude keys. |
| 5 | **Test connection** works for every cloud + Player2 mode. |
| 6 | **Env / `.env` bootstrap** still works for Claude; extend or document equivalent vars for new providers without breaking existing installs. |

## Definition of done

- Settings provider control is a dropdown including Claude, GPT, Gemini, Grok, Player2, llama.cpp
- Each cloud mode has API key + model selection, validation, secure save, and connectivity test
- Runtime `selectProvider` / registry routes generate calls to the chosen vendor+model
- Existing Claude / Player2 / llama paths keep working; migration from old settings schema is seamless
- Tests cover schema, UI selection, adapters, and wiring
- `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `act` PR-checks + deadcode workflows pass

Builds on **016** (settings), **005** / **014** (Claude / Player2 adapters), **020** (llama). Complements **112** (usage metering should record provider+model once adapters land).

Broken down into **113.1–113.8**.

113.1 settings schema + dropdown UX · 113.2 curated model catalogs · 113.3 OpenAI GPT adapter · 113.4 Gemini adapter · 113.5 Grok adapter · 113.6 Claude model picker parity · 113.7 registry wiring secrets validation tests · 113.8 settings smoke + docs

## Sub-tickets

### 113.1 Settings schema + provider dropdown UX

#### Description
Replace the provider radio group with a dropdown and extend `ProviderSettings` so cloud vendors (Claude, GPT, Gemini, Grok) and local modes (Player2, llama.cpp) share one selector. Show provider-specific field groups (key, model, endpoint) based on selection without discarding saved values when switching.

#### Acceptance Criteria
- [x] `ProviderMode` (or successor) includes `claude` | `openai` | `gemini` | `grok` | `player2` | `llamacpp`
- [x] Settings UI uses a `<select>` / accessible dropdown labeled Provider (not radios)
- [x] Switching provider shows the correct field group; previously saved values for other providers are retained
- [x] Validation errors are mode-specific (missing key, missing model, bad URL)
- [x] Save disabled until draft is valid and dirty (existing Save/Cancel behavior preserved)
- [x] Unit/UI tests cover dropdown change and field visibility

### 113.2 Curated model catalogs per cloud provider

#### Description
Define curated model id lists (and defaults) for Claude, GPT, Gemini, and Grok so users can pick a model from a dropdown without memorizing slugs. Allow an optional “Custom…” model id for power users.

#### Acceptance Criteria
- [x] Shared catalog module lists display label + API model id per provider
- [x] Each cloud provider has a documented default model (sensible mid-tier, not the absolute most expensive)
- [x] UI model dropdown is populated from the catalog; selecting Custom reveals a free-text model id field
- [x] Invalid empty custom id fails validation
- [x] Catalog is easy to update when vendors rename models (single source of truth)
- [x] Unit tests lock defaults and require every catalog entry to have a non-empty model id

### 113.3 OpenAI GPT provider adapter

#### Description
Implement an OpenAI Chat Completions (or current Responses-compatible) provider adapter behind the existing `Provider` interface, configurable by API key + model id from Settings.

#### Acceptance Criteria
- [x] `createOpenAiProvider({ apiKey, model })` implements `Provider.generate`
- [x] Honors `GenerateContext` (`systemPrompt`, `maxTokens`)
- [x] Truncation / failure behavior matches project norms (fail loud on max-token truncation where detectable)
- [x] Config error when API key missing; request errors do not leak the key in messages
- [x] Unit tests with mocked fetch cover success, auth failure, and truncation/error paths
- [x] Settings “Test connection” can ping this adapter

### 113.4 Gemini provider adapter

#### Description
Implement a Google Gemini API provider adapter behind `Provider.generate`, configurable by API key + model id from Settings.

#### Acceptance Criteria
- [x] `createGeminiProvider({ apiKey, model })` implements `Provider.generate`
- [x] Honors `GenerateContext` (`systemPrompt`, `maxTokens`) with Gemini’s request shape
- [x] Clear config/request errors; API key never appears in thrown messages or logs
- [x] Unit tests with mocked fetch cover success and failure paths
- [x] Settings “Test connection” works in Gemini mode

### 113.5 Grok (xAI) provider adapter

#### Description
Implement an xAI Grok provider adapter (OpenAI-compatible chat endpoint or official xAI API) behind `Provider.generate`, configurable by API key + model id from Settings.

#### Acceptance Criteria
- [x] `createGrokProvider({ apiKey, model, baseUrl? })` implements `Provider.generate`
- [x] Default base URL points at xAI’s public API; override only if explicitly needed
- [x] Honors `GenerateContext`; truncation/error handling consistent with other cloud adapters
- [x] Unit tests with mocked fetch cover success and failure paths
- [x] Settings “Test connection” works in Grok mode
- [x] Curated catalog seeds include at least one mid-tier and notes flagship options (e.g. grok-4.3 / grok-4.5 class ids current at implementation time)

### 113.6 Claude model picker parity

#### Description
Bring Claude settings in line with other cloud providers: model dropdown from the curated catalog (not only a hidden default / env default), plus optional custom model id.

#### Acceptance Criteria
- [x] Claude mode shows Model dropdown populated from the Claude catalog
- [x] Custom model id path works the same as other cloud providers
- [x] Existing saved `claudeModel` / env default migrates cleanly
- [x] Test connection still works for Claude
- [x] Unit/UI tests cover Claude model selection persistence

### 113.7 Registry wiring, secrets, validation, and tests

#### Description
Wire new providers into `createProviderRegistry` / `selectProvider`, persist and redact API keys for GPT/Gemini/Grok like Claude, and harden validation + migration from the pre-113 settings shape.

#### Acceptance Criteria
- [x] Runtime selects the correct adapter from saved settings mode + model
- [x] Keys for openai / gemini / grok are stored securely; renderer sees only `*ApiKeySet` redaction flags after load
- [x] `.env` / bootstrap story documented for new keys (or intentionally Settings-only — stated in ticket notes)
- [x] Old settings JSON without new fields loads with safe defaults (no crash)
- [x] Integration-style tests cover registry selection for each new mode
- [x] oxlint-clean; no `any` escapes in new code

### 113.8 Settings smoke + docs

#### Description
Verify the expanded Settings flow in dev (and note packaged expectations), and update user-facing docs so GPT / Gemini / Grok setup is discoverable next to Claude / Player2.

#### Acceptance Criteria
- [x] Manual smoke checklist: pick each cloud provider, set key + model, Test connection, Save, run one generate path (or settings ping)
- [x] Player2 and llama.cpp still reachable from the same dropdown
- [x] README Setup section mentions the four cloud providers and that model is chosen in Settings
- [x] Epic **113** definition of done checked only after verification gate (`npm test` / lint / build / deadcode / `act`)

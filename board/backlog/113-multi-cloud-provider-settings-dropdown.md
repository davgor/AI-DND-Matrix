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

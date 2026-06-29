# EPIC: Main-screen settings + provider setup

Add a Settings entry from the main screen so players can configure AI providers without editing files manually: API-key providers, local llama setup/download path, and custom Player2 endpoint.

Broken down into sub-tickets 016.1-016.10. This epic is done when all of them are.

016.1 main-screen settings entry point · 016.2 settings shell + navigation · 016.3 provider mode selector + schema · 016.4 API key settings UI + secure save path · 016.5 llama local enable + runtime/model setup flow · 016.6 Player2 endpoint settings + connectivity test · 016.7 settings persistence + startup hydration · 016.8 validation/error UX + redaction rules · 016.9 runtime wiring from settings to provider selection · 016.10 settings smoke test (dev + packaged)

## Sub-tickets

### 016.1 Main-screen settings entry point

#### Description
Add a visible Settings button on the app's main screen as the primary entry to provider setup.

#### Acceptance Criteria
- [x] Main screen has a visible Settings action consistent with existing UI patterns
- [x] Settings action is keyboard and mouse accessible
- [x] Selecting Settings routes to settings view without side effects to campaign/session state
- [x] Unit/UI test verifies Settings entry interaction

### 016.2 Settings shell + navigation

#### Description
Implement a settings shell/view structure that can host provider setup sections and future settings categories.

#### Acceptance Criteria
- [x] Settings view has stable layout sections (for example: Provider, Runtime, Connectivity, Save/Apply)
- [x] Navigation into and out of Settings is deterministic (back/cancel/apply behaviors)
- [x] Unsaved-change behavior is handled intentionally (prompt or auto-save rule)
- [x] Unit/UI tests cover baseline navigation states

### 016.3 Provider mode selector + schema

#### Description
Add provider mode selection and typed settings schema so users can switch between API-key provider, local llama provider, and Player2 endpoint mode.

#### Acceptance Criteria
- [x] Settings include provider mode selector with at least: Claude/API-key, llama local, Player2 endpoint
- [x] Provider-specific field groups show/hide correctly based on selected mode
- [x] Typed settings schema validates required fields per mode
- [x] Mode switch does not silently discard previously saved provider-specific values

### 016.4 API key settings UI + secure save path

#### Description
Enable users to enter/update API keys from Settings with secure handling and redacted display rules.

#### Acceptance Criteria
- [x] Settings form supports entering/updating API key values for API-key provider mode
- [x] Key fields are masked/redacted in UI and never displayed in plain text after save
- [x] Renderer does not receive raw stored secrets beyond explicit write/test operations
- [x] Save path uses existing secure main-process config/secrets boundaries
- [x] Unit tests verify redaction and secure handling behavior

### 016.5 llama local enable + runtime/model setup flow

#### Description
Provide a guided settings flow to enable local llama mode, including runtime acquisition/setup and model path configuration.

#### Acceptance Criteria
- [x] Settings include toggle/selection to enable local llama provider mode
- [x] Flow supports configuring runtime executable path and model path
- [x] Flow supports guided download/setup path (or explicit install instructions) for llama runtime when missing
- [x] Runtime/model validity checks run before allowing apply/ready
- [x] Failure states (missing runtime/model, invalid path, launch failure) are actionable and recoverable

### 016.6 Player2 endpoint settings + connectivity test

#### Description
Allow users to set a custom Player2 base URL and validate connectivity from Settings.

#### Acceptance Criteria
- [x] Settings include Player2 base URL input with sane default and clear format guidance
- [x] URL validation catches malformed or unsupported endpoint formats before save
- [x] "Test connection" action performs live connectivity check and returns success/failure result
- [x] Connectivity failures present clear diagnostic message without crashing UI

### 016.7 Settings persistence + startup hydration

#### Description
Persist provider settings and hydrate them on startup so selected provider config is applied consistently.

#### Acceptance Criteria
- [x] Provider settings persist locally across app restarts
- [x] Startup hydration loads persisted settings before provider selection is constructed
- [x] Backward-compatible defaults exist for users with no saved settings yet
- [x] Persistence path is tested for save/load/update flows

### 016.8 Validation/error UX + redaction rules

#### Description
Implement consistent validation and error messaging for provider settings with strict secret redaction.

#### Acceptance Criteria
- [x] Settings validation errors are field-specific and actionable
- [x] Runtime/connection test errors are mapped to user-friendly messages
- [x] Logs and UI messages never include raw API keys or sensitive filesystem tokens
- [x] Tests verify redaction behavior across success/failure paths

### 016.9 Runtime wiring from settings to provider selection

#### Description
Wire persisted settings into runtime provider selection so agent calls use the configured provider mode and options.

#### Acceptance Criteria
- [x] Provider registry/provider builder consumes hydrated settings rather than hardcoded/default-only config
- [x] Switching provider mode from settings changes runtime provider behavior without code changes
- [x] Invalid configured provider state surfaces typed runtime error rather than uncaught exception
- [x] Unit tests verify provider selection for API-key, llama local, and Player2 modes

### 016.10 Settings smoke test (dev + packaged)

#### Description
Validate end-to-end settings behavior for provider setup in development and packaged builds.

#### Acceptance Criteria
- [x] Dev-mode smoke verifies: open settings from main screen, update provider settings, apply, and observe runtime provider change
- [x] Packaged-mode smoke verifies same flows for at least one API-key mode and one local/endpoint mode
- [x] Expected-failure smoke verifies actionable errors for invalid key/runtime/endpoint config
- [x] Smoke runbook documents steps, environment, and observed outcomes

import type { AutoUpdateApi, BackgroundApi, CampaignsApi, CharactersApi, CompanionsApi, LogBookApi, CombatApi, FilesApi, GuidedCreationApi, JournalApi, NpcDossierApi, RelationshipWebApi, AskDmApi, LlmUsageApi, ProgressionApi, QuestsApi, RaceApi, SettingsApi, SettingsIntroApi, SpellbookApi, StartupApi, StartingLoadoutApi, TurnApi, WindowControls } from '../../preload'

declare global {
  interface Window {
    windowControls: WindowControls
    campaigns: CampaignsApi
    files: FilesApi
    characters: CharactersApi
    logBook: LogBookApi
    guidedCreation: GuidedCreationApi
    companions: CompanionsApi
    turn: TurnApi
    combat: CombatApi
    progression: ProgressionApi
    startup: StartupApi
    settings: SettingsApi
    llmUsage: LlmUsageApi
    settingsIntro: SettingsIntroApi
    autoUpdate: AutoUpdateApi
    quests: QuestsApi
    spellbook: SpellbookApi
    startingLoadout: StartingLoadoutApi
    race: RaceApi
    background: BackgroundApi
    npcDossier: NpcDossierApi
    relationshipWeb: RelationshipWebApi
    journal: JournalApi
    askDm: AskDmApi
  }
}

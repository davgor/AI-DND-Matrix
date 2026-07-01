import type { Character } from '../../../db/repositories/characters'
import { GuidedConversationShell } from '../guidedCreation/GuidedConversationShell'

export interface GuidedIdentityStageProps {
  campaignId: string
  character: Character
  onAdvance: () => void
  onRefresh: () => Promise<void>
}

export function GuidedIdentityStage(props: GuidedIdentityStageProps): JSX.Element {
  const ready = props.character.guidedCreationPhase !== 'identity'

  return (
    <GuidedConversationShell
      campaignId={props.campaignId}
      characterId={props.character.id}
      phase="identity"
      title="Tell me about yourself"
      subtitle="The DM will help you shape who your character is before the story begins."
      phaseComplete={ready}
      advanceLabel="Help me set the stage"
      onAdvance={props.onAdvance}
      onStateChange={() => void props.onRefresh()}
    />
  )
}

export interface GuidedOpeningSceneStageProps {
  campaignId: string
  character: Character
  onEnterPlay: () => void
  enterPlayBlockerMessage?: string | null
  onRefresh: () => Promise<void>
}

export function GuidedOpeningSceneStage(props: GuidedOpeningSceneStageProps): JSX.Element {
  const ready = props.character.guidedCreationPhase === 'complete'

  return (
    <div className="guided-opening-scene-stage">
      {props.enterPlayBlockerMessage ? (
        <p className="guided-play-blocker panel-card" role="alert">
          {props.enterPlayBlockerMessage}
        </p>
      ) : null}
      <GuidedConversationShell
        campaignId={props.campaignId}
        characterId={props.character.id}
        phase="opening_scene"
        title="Help me set the stage"
        subtitle="Negotiate where the story begins. When you are ready, enter the world."
        phaseComplete={ready}
        advanceLabel="Enter the world"
        onAdvance={props.onEnterPlay}
        onStateChange={() => void props.onRefresh()}
      />
    </div>
  )
}

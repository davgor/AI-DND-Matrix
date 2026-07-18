import {
  GuidedConversationComposerView,
  type GuidedConversationComposerProps
} from './GuidedConversationComposerView'
import { useGeneratingStatus } from './useGeneratingStatus'

export type { GuidedConversationComposerProps }

type GuidedConversationComposerShellProps = Omit<GuidedConversationComposerProps, 'generateLabel'>

export function GuidedConversationComposer(props: GuidedConversationComposerShellProps): JSX.Element {
  const generateLabel = useGeneratingStatus(props.generating)
  return <GuidedConversationComposerView {...props} generateLabel={generateLabel} />
}

import { IDENTITY_FOUNDATION_SPECS } from '../../../shared/guidedCreation/types'
import type { IdentityFoundationsStatus } from '../../../shared/guidedCreation/types'

export interface FoundationProgressProps {
  foundations: IdentityFoundationsStatus
}

export function FoundationProgress(props: FoundationProgressProps): JSX.Element {
  return (
    <div className="guided-foundation-progress">
      {IDENTITY_FOUNDATION_SPECS.map((spec) => {
        const status = props.foundations[spec.key]
        return (
          <div
            key={spec.key}
            className={
              status.complete
                ? 'guided-foundation-chip guided-foundation-chip-complete'
                : 'guided-foundation-chip'
            }
            title={spec.meaning}
          >
            {spec.label}
          </div>
        )
      })}
    </div>
  )
}

import './onboardingBackButton.css'

export function OnboardingBackButton(props: {
  onBack: () => void
  className?: string
}): JSX.Element {
  const className = props.className
    ? `onboarding-back ${props.className}`
    : 'onboarding-back'
  return (
    <button type="button" className={className} onClick={props.onBack}>
      <span className="onboarding-back-arrow" aria-hidden="true">
        ←
      </span>
      <span>Back</span>
    </button>
  )
}

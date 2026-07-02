export function CurrencyChip(props: { currency: number; className?: string }): JSX.Element {
  const className = props.className
    ? `currency-chip ${props.className}`
    : 'currency-chip'
  return (
    <span className={className} aria-label={`${props.currency} gold`}>
      {props.currency} gp
    </span>
  )
}

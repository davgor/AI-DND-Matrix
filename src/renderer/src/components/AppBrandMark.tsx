import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import appBrandMarkUrl from '../assets/app-icon.png'
import './appBrandMark.css'

interface AppBrandMarkProps {
  className?: string
  size?: number
}

export function AppBrandMark(props: AppBrandMarkProps = {}): JSX.Element {
  const size = props.size ?? 16
  return (
    <img
      className={props.className ?? 'app-brand-mark'}
      src={appBrandMarkUrl}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
    />
  )
}

export function AppBrandLockup(props: {
  className?: string
  markSize?: number
  nameClassName?: string
}): JSX.Element {
  return (
    <span className={props.className ?? 'app-brand-lockup'}>
      <AppBrandMark size={props.markSize} />
      <span className={props.nameClassName}>{APP_DISPLAY_NAME}</span>
    </span>
  )
}

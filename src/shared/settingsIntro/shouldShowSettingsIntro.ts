export function shouldShowSettingsIntro(dismissed: boolean, devForceShow: boolean): boolean {
  if (devForceShow) {
    return true
  }
  return !dismissed
}

const SPELLCHECK_SELECTOR =
  'textarea, input[type="text"], input[type="search"], input:not([type])'
const NO_SPELLCHECK_SELECTOR = 'input[type="password"], input[type="number"]'

export function applySpellcheckToEditableFields(root: ParentNode): void {
  for (const element of root.querySelectorAll<HTMLElement>(SPELLCHECK_SELECTOR)) {
    if (element.matches(NO_SPELLCHECK_SELECTOR)) {
      continue
    }
    element.spellcheck = true
  }

  for (const element of root.querySelectorAll<HTMLElement>(NO_SPELLCHECK_SELECTOR)) {
    element.spellcheck = false
  }
}

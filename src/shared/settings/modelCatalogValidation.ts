import type { SettingsValidationError } from './types'

export function validateCustomModelId(customId: string, field: string): SettingsValidationError | null {
  if (customId.trim()) {
    return null
  }
  return { field, message: 'Enter a custom model id, or pick a catalog model.' }
}

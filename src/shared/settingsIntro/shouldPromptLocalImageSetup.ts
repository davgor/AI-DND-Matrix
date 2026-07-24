export function shouldPromptLocalImageSetup(input: {
  localLlmJustCompleted: boolean
  postLocalLlmPromptDeclined: boolean
  imageEnabled: boolean
}): boolean {
  return (
    input.localLlmJustCompleted &&
    !input.postLocalLlmPromptDeclined &&
    !input.imageEnabled
  )
}

// Manual smoke test for the Claude provider adapter (ticket 005.4).
// Not part of the build/test pipeline — run by hand with a real CLAUDE_API_KEY in .env:
//   node scripts/claude-smoke-test.mjs
import 'dotenv/config'

const apiKey = process.env.CLAUDE_API_KEY
const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6'

if (!apiKey) {
  console.error('CLAUDE_API_KEY is not set in .env')
  process.exit(1)
}

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model,
    max_tokens: 256,
    messages: [
      { role: 'user', content: 'Say hello in one sentence, in character as a fantasy game master.' }
    ]
  })
})

if (!response.ok) {
  console.error(`Claude API returned status ${response.status}`)
  console.error(await response.text())
  process.exit(1)
}

const data = await response.json()
console.log('CLAUDE SMOKE TEST RESPONSE:', data.content?.[0]?.text)

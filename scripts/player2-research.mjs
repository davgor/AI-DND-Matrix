// Research-only spike for ticket 014.1 — confirms Player2's real API shape against the
// locally running Player2 app before any provider adapter code is written.
// Not part of the build/test pipeline — run by hand with Player2 running:
//   node scripts/player2-research.mjs
const baseUrl = process.env.PLAYER2_BASE_URL ?? 'http://127.0.0.1:4315'

async function probeModels() {
  const response = await fetch(`${baseUrl}/v1/models`)
  console.log('GET /v1/models ->', response.status)
  console.log(await response.text())
}

async function probeChatCompletion() {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a terse fantasy game master.' },
        { role: 'user', content: 'Say hello in one short sentence.' }
      ],
      max_tokens: 64,
      temperature: 0.7
    })
  })
  console.log('POST /v1/chat/completions ->', response.status)
  console.log(await response.text())
}

async function probeMalformedRequest() {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  })
  console.log('POST /v1/chat/completions (malformed, no messages) ->', response.status)
  console.log(await response.text())
}

await probeModels()
await probeChatCompletion()
await probeMalformedRequest()

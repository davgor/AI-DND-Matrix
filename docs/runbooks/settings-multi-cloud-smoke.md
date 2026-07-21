# Settings multi-cloud provider smoke (epic 113)

Manual checklist after implementing 113.1–113.7. Run against a dev build (`npm run dev`).

## Cloud providers

For each of **Claude**, **GPT (OpenAI)**, **Gemini**, **Grok (xAI)**:

1. Open Settings → Provider dropdown → select the vendor.
2. Paste a real API key (or confirm “saved” badge if already stored).
3. Pick a catalog model (and once: Custom… with a valid id).
4. Click **Test connection** → expect success.
5. **Save**, close Settings, reopen → mode + model persist; key shows as saved (not plaintext).
6. Start or continue a campaign turn / generate path that calls the LLM once → succeeds with the chosen provider.

## Local modes

7. Provider dropdown → **Player2** → base URL + Test connection (with Player2 running).
8. Provider dropdown → **Local llama.cpp** → Check runtime still works as before.

## Notes

- Old `settings.json` without openai/gemini/grok fields must load without crash (defaults backfilled).
- Packaged builds: keys still live in encrypted Settings store; `.env` beside the `.exe` remains a bootstrap option for cloud keys.

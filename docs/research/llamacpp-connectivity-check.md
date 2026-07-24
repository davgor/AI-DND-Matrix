# Manual llama-server connectivity check (020.1)

Assumes `llama-server` is already running (attach mode) on the defaults from this research note.

```powershell
# Health (200 = ready, 503 = still loading)
curl.exe -s -o - -w "`nHTTP %{http_code}`n" http://127.0.0.1:8080/health

# One chat-completions round-trip
curl.exe -s http://127.0.0.1:8080/v1/chat/completions `
  -H "content-type: application/json" `
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Say hi in five words.\"}],\"max_tokens\":32}"
```

Settings → Local → **Check runtime** is the in-app equivalent for attach mode.

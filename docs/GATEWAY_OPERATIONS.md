# Local gateway secret operations

This procedure applies only to the optional loopback simulator gateway. It does not enable aircraft or hardware access. The Studio does not use this token, and GitHub Pages does not host this gateway.

## Generate a token on Windows PowerShell

Generate 32 random bytes with the operating system cryptographic provider. The commands keep the value in the current PowerShell process environment and do not print it:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$env:ADIGUN_GATEWAY_TOKEN = [Convert]::ToBase64String($bytes)
[Array]::Clear($bytes, 0, $bytes.Length)
$rng.Dispose()
npm run gateway:start
```

Keep the PowerShell session open while the service runs. The token is inherited by the local Node process and is removed from that shell environment when the shell exits. Do not paste it into source, a committed `.env` file, browser code, screenshots, support tickets, or command arguments.

## Rotate or revoke

1. Stop the running process with `Ctrl+C` or send it `SIGTERM`. It stops accepting work, drains active requests for up to 20 seconds, then closes remaining connections.
2. Generate a new token in the shell that will start the replacement process.
3. Update any local integration that uses the old token, then start the replacement gateway. The old token is revoked when its process has stopped; this gateway has no token store or remote clients.
4. Confirm the replacement process reports its simulation-only loopback address. Use the new token only from a trusted local integration.

If a token is exposed, stop the process immediately, discard that shell, generate a fresh token, and restart. Treat shell transcripts, process inspection by other users, malware, and administrator access as outside this local tool's protection. The environment variable is not a production secret manager and is not appropriate for a shared or network-exposed service.

## Operational limits

Rotation is a stop-and-restart procedure; there is no online token reload, account system, or audit trail. The current service is loopback-only and simulation-only. Its rate limit and bounded shutdown do not establish production hardening, hardware authorization, or safe aircraft operation.


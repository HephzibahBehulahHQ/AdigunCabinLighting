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

## Optional Linux systemd service

The repository includes \`deploy/systemd/adigun-cabin-gateway.service\` for a local Linux simulator host. It requires systemd 247 or newer for \`LoadCredential\`. This is a supervised local service template, not a hosted deployment or an aircraft/hardware interface. The service binds to \`127.0.0.1\`, returns simulation data only, and has no physical output path.

Build the gateway in a trusted checkout, then install the compiled runtime files at the paths used by the unit:

\`\`\`sh
npm ci
npm run build:gateway
sudo install -d -m 0755 /opt/adigun-cabin-lighting/gateway /opt/adigun-cabin-lighting/dist-gateway
sudo cp -R dist-gateway/. /opt/adigun-cabin-lighting/dist-gateway/
sudo install -m 0644 gateway/start.mjs /opt/adigun-cabin-lighting/gateway/start.mjs
\`\`\`

If Node.js is not at \`/usr/bin/node\`, edit \`ExecStart\` in the unit to the absolute path reported by \`command -v node\`. Create a root-only credential file without printing its contents, install the unit, then start it:

\`\`\`sh
sudo install -d -o root -g root -m 0700 /etc/adigun-cabin-lighting
sudo sh -c 'umask 077; openssl rand -base64 32 | tr -d '\n' > /etc/adigun-cabin-lighting/gateway-token'
sudo install -m 0644 deploy/systemd/adigun-cabin-gateway.service /etc/systemd/system/adigun-cabin-gateway.service
sudo systemctl daemon-reload
sudo systemctl enable --now adigun-cabin-gateway.service
sudo systemctl status --no-pager adigun-cabin-gateway.service
\`\`\`

Systemd exposes the token through its private credential directory; \`gateway/start.mjs\` reads it without copying the secret into the service command line or logs. The unit uses a transient service identity, restart limits, a 25-second stop timeout for the gateway's 20-second graceful drain, and filesystem/kernel restrictions. Review the unit against the host's local systemd policy before enabling it. To stop it, run \`sudo systemctl disable --now adigun-cabin-gateway.service\`; to rotate its token, replace the root-only source credential and restart the service. Do not put a token in \`Environment=\`, \`EnvironmentFile=\`, or process arguments.

## Operational limits

Rotation is a stop-and-restart procedure; there is no online token reload, account system, or audit trail. The optional systemd template has not been exercised on a qualified target host and is not a substitute for independent security review. The gateway remains loopback-only and simulation-only. Its rate limit, process supervision, and bounded shutdown do not establish hardware authorization or safe aircraft operation.


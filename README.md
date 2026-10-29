# Kick Sound Alerts

Play a sound in OBS when a viewer redeems a [Kick](https://kick.com) channel point reward.

[Example Website](https://audio.mrkaffin.com/)

You host it once. Streamers just log in with Kick, add their sounds and paste one link into OBS. They don't install anything.

- **Rewards are created for you.** Streamers enter a name, a cost and a sound; the reward appears on their Kick channel automatically. Rewards that already exist on Kick can get a sound too.
- **One link per streamer.** Each streamer gets a private, unguessable OBS browser source URL that can be regenerated at any time.
- **Multi-streamer.** One deployment serves any number of channels.
- **Official Kick API.** OAuth 2.1 login, channel reward management and signed webhooks. No scraping, no unofficial sockets.
- **No dependencies.** Plain Node.js, no `npm install`.

## How it works

```
Viewer redeems "sound1" on Kick
  → Kick sends a signed webhook to https://your-domain/webhook
  → The server verifies the signature and finds the streamer and the reward
  → The streamer's OBS browser source (/overlay/<secret-key>) plays the sound
```

- Each redemption plays once, even if Kick delivers the webhook more than once. Rejected redemptions don't play.
- Sounds that arrive back to back are queued, so they never overlap.

### What streamers do

1. Open your site and click **Log in with Kick**.
2. Enter a reward name, a cost and a sound file, and click **Add**.
3. Copy the **OBS link** and add it to OBS as a **Browser** source.

---

## Self-hosting

The recommended setup runs on any Linux server with Docker and exposes the app through a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). No ports need to be opened, it doesn't conflict with other sites on the same server, and Cloudflare provides HTTPS.

Throughout this guide, replace `alerts.example.com` with your own domain and `SERVER_IP` with your server's IP address.

**Requirements**

- A Linux server (any small VPS works, 1 GB RAM is plenty)
- A domain managed by Cloudflare
- A Kick account

### Step 1: Create a Kick app

1. On kick.com, go to **Settings → Developer** and click **Create App**.
2. Fill in:

   | Field | Value |
   |---|---|
   | App name | Shown to streamers on Kick's consent screen |
   | Redirect URL | `https://alerts.example.com/auth/callback` |
   | Enable webhooks | **On** |
   | Webhook URL | `https://alerts.example.com/webhook` |

3. Select these scopes:
   - `user:read`
   - `channel:read`
   - `channel:rewards:read`
   - `channel:rewards:write`
   - `events:subscribe`
4. Save and note the **Client ID** and **Client Secret**.

> Both URLs must match exactly: `https://`, no trailing slash.

### Step 2: Install Docker on the server

```bash
ssh root@SERVER_IP
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

### Step 3: Get the code onto the server

```bash
git clone https://github.com/EmreSarikaya35/kick-sound-alerts.git /opt/kick-sound-alerts
cd /opt/kick-sound-alerts
```

Or copy the files from your machine with `rsync` (see [Updating](#updating)).

### Step 4: Create a Cloudflare Tunnel

1. In the Cloudflare dashboard, open **Zero Trust → Networks → Tunnels** and click **Create a tunnel**.
2. Choose **Cloudflared**, give it a name and pick **Docker** as the environment.
3. Copy the token from the command shown (the long string after `--token`, starting with `eyJ`). **Don't run the command**; Docker Compose will run the tunnel for you.
4. The page waits for the tunnel to connect before it lets you continue. Finish Steps 5 and 6, then come back.
5. Once connected, add a route (**Routes → Add route → Published application**):

   | Field | Value |
   |---|---|
   | Subdomain | `alerts` |
   | Domain | `example.com` |
   | Path | empty |
   | Service URL | `http://app:3000` |

Cloudflare creates the DNS record for you. If a record for that subdomain already exists, delete it first.

> The Cloudflare dashboard changes from time to time. If the menus look different, look for "Tunnels"; the steps are the same.

### Step 5: Configure

```bash
cd /opt/kick-sound-alerts
cp .env.example .env
nano .env
```

Fill in:

```
KICK_CLIENT_ID=your Kick client ID
KICK_CLIENT_SECRET=your Kick client secret
PUBLIC_URL=https://alerts.example.com
TUNNEL_TOKEN=eyJ...
```

### Step 6: Start

```bash
docker compose up -d --build
docker compose logs -f
```

You should see:

```
app-1     | Ready: https://alerts.example.com  (port 3000, 0 streamers)
tunnel-1  | ... Registered tunnel connection ...
```

Press `Ctrl+C` to leave the logs; the app keeps running. Always start it with `-d`. Without it, the app stops when you close the terminal.

The containers restart automatically after a reboot.

### Step 7: Verify

1. Open `https://alerts.example.com/healthz`. You should see `{"ok":true,"users":0}`.
2. Open `https://alerts.example.com` and log in with Kick.
3. The dashboard should show no warning banners. If it says it isn't receiving reward notifications, check the webhook settings from Step 1 and click **Repair**.
4. Add a sound reward, add the OBS link to OBS and click **Test**. The sound should play in OBS.
5. Redeem the reward on Kick. The sound should play and appear under **Recent activity**.

---

## Updating

On the server:

```bash
cd /opt/kick-sound-alerts
git pull
docker compose up -d --build
```

If you develop locally instead, `deploy.sh` uploads your working copy with `rsync` and rebuilds the containers in one step. Create a `.deploy.env` file next to it (it's git-ignored):

```
DEPLOY_HOST=root@SERVER_IP
DEPLOY_DIR=/opt/kick-sound-alerts
```

Then run `./deploy.sh`.

Streamer data and sounds live in a Docker volume and survive updates.

## Backups

Copy the data directory out of the running container:

```bash
cd /opt/kick-sound-alerts
docker compose cp app:/data ./backup-$(date +%F)
```

## Configuration

All settings are environment variables, read from `.env`.

| Variable | Description |
|---|---|
| `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET` | Your Kick app credentials (required) |
| `PUBLIC_URL` | Public address of the site, no trailing slash |
| `TUNNEL_TOKEN` | Cloudflare Tunnel token (tunnel setup only) |
| `PORT` | HTTP port, default `3000` |
| `DATA_DIR` | Data directory, default `data` (`/data` in Docker) |
| `MAX_SOUND_MB` | Max sound file size, default `5` |
| `MAX_ALERTS` | Max sound rewards per streamer, default `30` (Kick's limit is 50) |
| `SESSION_SECRET` | Cookie signing secret; generated and stored in the data directory if empty |

## Other ways to run it

### Caddy instead of a tunnel

If ports 80 and 443 are free on your server, Caddy can serve the site and obtain the certificate itself. Point a DNS A record at your server (with Cloudflare's proxy **off**), put your domain in `Caddyfile`, and run:

```bash
docker compose -f docker-compose.caddy.yml up -d --build
```

### Without Docker

Node.js 18 or newer is all you need:

```bash
cp .env.example .env   # fill it in
npm start
```

Put it behind something that provides HTTPS (a reverse proxy or a tunnel). With nginx, add `proxy_buffering off;` for `/events/`, otherwise sounds reach OBS late.

### Local development

Kick needs a public HTTPS URL for the webhook. A quick tunnel gives you one:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set the `https://….trycloudflare.com` address as `PUBLIC_URL`, update the Redirect and Webhook URLs in your Kick app, and run `npm start`. The address changes every time the tunnel restarts.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `TUNNEL_TOKEN must be set in .env` | Add the `TUNNEL_TOKEN=` line to `.env`. |
| Tunnel logs say "Unauthorized" or "invalid token" | The token was copied incompletely. Copy it again from the tunnel's page in Cloudflare. |
| `DNS_PROBE_FINISHED_NXDOMAIN` | The tunnel has no route yet. Add one (Step 4.5). |
| Cloudflare "Error 1033" | The tunnel isn't connected. Check that the `tunnel` service is running with `docker compose ps`. |
| "Bad gateway" (502) | Wrong service URL on the tunnel route. It must be `http://app:3000`, not `localhost`. |
| App exits with "KICK_CLIENT_ID and KICK_CLIENT_SECRET must be set" | `.env` is missing or empty. |
| `redirect_uri` error during login | The Redirect URL in your Kick app must be exactly `PUBLIC_URL/auth/callback`. |
| "webhook not enabled for app" | Turn on **Enable webhooks** in your Kick app and set the Webhook URL, then click **Repair** in the dashboard. |
| Test works, real redemptions don't | The Webhook URL in your Kick app must be exactly `PUBLIC_URL/webhook`. |
| Permission error when adding a reward | `channel:rewards:write` is missing from the scopes. After adding it, streamers must log out and back in. |
| "OBS not connected" | The browser source isn't added, or it uses an old link. Right-click the source in OBS and choose **Refresh**. |

## Security

- Webhooks are verified against Kick's public key (RSA-SHA256). Unsigned or tampered requests are rejected.
- Sessions are HMAC-signed, `HttpOnly`, `SameSite=Lax` cookies. State-changing API calls also require a same-origin `Origin` header.
- Overlay URLs contain a random 144-bit key and can be regenerated from the dashboard.
- Kick tokens are stored server-side only, in `DATA_DIR/users/*.json`. Protect that directory and `.env`.

## Project structure

```
server.js                 HTTP server: sessions, webhook, dashboard API, overlay stream
lib/kick.js               Kick OAuth, API client and webhook signature verification
lib/store.js              JSON file storage (data/users/*.json, data/sounds/<id>/)
public/index.html         Landing page and streamer dashboard
public/overlay.html       OBS browser source
Dockerfile                App image
docker-compose.yml        App + Cloudflare Tunnel
docker-compose.caddy.yml  App + Caddy (alternative)
Caddyfile                 Caddy config for the alternative setup
deploy.sh                 Upload and rebuild from your machine
```

## License

[MIT](LICENSE)

# Kick Sound Alerts

Let viewers play sounds on stream with [Kick](https://kick.com) channel points, and have their messages read aloud.

[Example Website](https://audio.mrkaffin.com/)

You host it once. Streamers log in with Kick, add their sounds and paste one link into OBS. They don't install anything.

- **Rewards are created for you.** Streamers pick a name, a cost, a color and a sound; the reward appears on their Kick channel automatically. Rewards that already exist on Kick can get a sound too.
- **Sounds from a file or from myinstants.com.** Upload your own file, or search [myinstants.com](https://www.myinstants.com), browse trending sounds and keep favorites without downloading anything.
- **Text-to-speech rewards.** The viewer types a message when redeeming and it's read aloud on stream, with a banned-word list and a spam filter.
- **Live controls.** Mute everything, skip the current sound or clear the queue while you're live.
- **An on-stream card** shows who redeemed what, with the message being read.
- **One link per streamer.** Each streamer gets a private, unguessable OBS browser source URL that can be regenerated at any time.
- **Multi-streamer.** One deployment serves any number of channels.
- **Official Kick API.** OAuth 2.1 login, channel reward management and signed webhooks. No scraping, no unofficial sockets.
- **No dependencies.** Plain Node.js, no `npm install`.

## How it works

```
Viewer redeems "sound1" on Kick
  → Kick sends a signed webhook to https://your-domain/webhook
  → The server verifies the signature and finds the streamer and the reward
  → The streamer's OBS browser source (/overlay/<secret-key>) plays the sound,
    then reads the viewer's message if it's a text-to-speech reward
```

- Each redemption plays once, even if Kick delivers the webhook more than once. Rejected redemptions don't play.
- Sounds that arrive back to back are queued, so they never overlap.

### What streamers do

1. Open the site and click **Log in with Kick**.
2. Copy the **OBS link** and add it to OBS as a **Browser** source.
3. Enter a reward name and a cost, pick a color and a sound (a file, or **myinstants**), and click **Add**.

## Features

### Sound rewards

- **Add**: name, cost, color on Kick (8 presets or a custom color) and a sound. Turn on **Read the viewer's message aloud** to make it a text-to-speech reward; the sound is then optional.
- **Attach** a sound to a reward that already exists on Kick.
- Per reward: **Test** plays it in OBS, **▶** plays it in the browser, and the **•••** menu changes the sound (file or myinstants), turns text-to-speech on or off, edits the name, cost and color, pauses or resumes it, or deletes it.
- Rewards created in the Kick dashboard keep their name, cost and color on Kick; only their sound is managed here.
- A volume slider per reward, on top of the master volume.

### myinstants.com picker

Search myinstants.com, see trending sounds, listen before choosing and star favorites (up to 50). The server downloads the chosen sound and stores it like an uploaded file, so it keeps working even if it disappears from myinstants. On phones the picker is a bottom sheet you can drag down to close.

### Text-to-speech

- The reward asks viewers for a message on Kick. When it's redeemed, the sound plays (if there is one) and then the message is read in Turkish or English.
- Messages are cut at 200 characters and links are removed.
- **Banned words**: messages containing a listed word are not read. Matching is by whole word, so banning `am` doesn't block `tamam`. An entry with spaces matches that exact phrase.
- **Spam filter**: messages made of one repeated character (`ğğğğğ`, `-----`, `ğ ğ ğ ğ ğ`), with no letters or digits, or dominated by a single character are not read.
- Skipped messages show up in **Recent activity** with the reason.

### Live controls

- **Mute all sounds**: nothing plays in OBS; redemptions are still logged. Muting also clears what's queued.
- **Skip current sound** and **Clear queue**.

### Settings

| Setting | What it does |
|---|---|
| Master volume | Scales every sound |
| Max sound length | Cuts sounds after N seconds (0 = no limit) |
| Even out loudness | Turns down sounds that are much louder than the rest |
| Show who redeemed it on stream | The on-stream card with the viewer's name and message |
| Text-to-speech voice | Turkish or English |
| Banned words | Comma or line separated |
| Regenerate OBS link | The old link stops working |
| Delete account | Removes the streamer's sounds, settings and the Kick rewards created here |

### Interface

- Turkish and English, from the button in the header (defaults to the browser's language).
- Automatic, light or dark theme from the theme button in the header, also available before logging in.
- Long lists (rewards, recent activity) show the first 3 with **Show all**.
- Respects the system's reduced motion, reduced transparency and increased contrast settings.

---

## Self-hosting

The recommended setup runs on any Linux server with Docker and exposes the app through a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). No ports need to be opened, it doesn't conflict with other sites on the same server, and Cloudflare provides HTTPS.

Throughout this guide, replace `alerts.example.com` with your own domain and `SERVER_IP` with your server's IP address.

**Requirements**

- A Linux server (any small VPS works, 1 GB RAM is plenty)
- A domain managed by Cloudflare
- A Kick account
- Outbound internet access to `kick.com`, `www.myinstants.com` (sound picker) and `translate.google.com` (text-to-speech)

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
git clone https://github.com/EmreSarikaya35/Audiobounty-V2.git /opt/kick-sound-alerts
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
6. Add a text-to-speech reward and redeem it with a message. The message should be read in OBS.

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
| `MAX_SOUND_MB` | Max sound file size, default `5`; also applies to myinstants sounds |
| `MAX_ALERTS` | Max sound rewards per streamer, default `30` (Kick's limit is 50) |
| `SESSION_SECRET` | Cookie signing secret; generated and stored in the data directory if empty |

Everything a streamer sets in the dashboard (rewards, volumes, text-to-speech, banned words, favorites, mute) is stored per streamer in `DATA_DIR/users/<id>.json`. Language and theme are stored in the browser.

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
| Nothing plays when a reward is redeemed | Check that **Mute all sounds** is off; muted redemptions show "(muted)" in Recent activity. |
| A message isn't read | Recent activity says why: a banned word or spam. Also check that the reward has text-to-speech turned on. |
| "myinstants.com is not responding" or no search results | The server can't reach myinstants.com, or myinstants changed its page layout (the picker reads its HTML; there's no official API). |
| "Text-to-speech is not available right now" | The server can't reach translate.google.com, or Google is blocking the unofficial endpoint. |

## Security

- Webhooks are verified against Kick's public key (RSA-SHA256). Unsigned or tampered requests are rejected.
- Sessions are HMAC-signed, `HttpOnly`, `SameSite=Lax` cookies. State-changing API calls also require a same-origin `Origin` header.
- Overlay URLs contain a random 144-bit key and can be regenerated from the dashboard.
- Kick tokens are stored server-side only, in `DATA_DIR/users/*.json`. Protect that directory and `.env`.
- The server only downloads sounds from `https://www.myinstants.com/media/sounds/`, without following redirects, so the picker can't be used to make it fetch other addresses.
- Reward colors must be `#rrggbb`; anything else is ignored.

## Project structure

```
server.js                 HTTP server: sessions, webhook, dashboard API, overlay stream,
                          myinstants search and text-to-speech proxy
lib/kick.js               Kick OAuth, API client and webhook signature verification
lib/store.js              JSON file storage (data/users/*.json, data/sounds/<id>/)
public/index.html         Landing page and streamer dashboard
public/overlay.html       OBS browser source: queue, on-stream card, text-to-speech
.env.example              Settings template
Dockerfile                App image
docker-compose.yml        App + Cloudflare Tunnel
docker-compose.caddy.yml  App + Caddy (alternative)
Caddyfile                 Caddy config for the alternative setup
deploy.sh                 Upload and rebuild from your machine
```

## License

[MIT](LICENSE)

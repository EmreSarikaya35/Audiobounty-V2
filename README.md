# AudioBounty

Let viewers play sounds on stream with [Kick](https://kick.com) channel points, and have their messages read aloud.

[Example Website](https://audio.mrkaffin.com/)

You host it once. Streamers log in with Kick, add their sounds and paste one link into OBS. They don't install anything.

- **Rewards are created for you.** Streamers pick a name, a cost, a color and a sound; the reward appears on their Kick channel automatically. Rewards that already exist on Kick can get a sound too.
- **Sounds from a file or from myinstants.com.** Upload your own file, or search [myinstants.com](https://www.myinstants.com), browse trending sounds and keep favorites without downloading anything.
- **Text-to-speech rewards.** The viewer types a message when redeeming and it's read aloud on stream, with a banned-word list and a spam filter.
- **Sound pools and trimming.** Give a reward up to 10 sounds and a random one plays each time; trim any sound to the part you want on a waveform.
- **Live controls.** See what's playing and what's waiting, remove one, skip the current sound, clear the queue or mute everything.
- **An on-stream card** shows who redeemed what, with the message being read, in your position, style, size and color, with an optional image or GIF per reward (linked, never stored).
- **Statistics, a public sound list and backups.** Redemptions and points over 30 days with top rewards and viewers, an optional `/c/<name>` page where viewers can listen to every sound, and a one-file backup you can restore.
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
- Per reward: **Test** plays it in OBS; tapping the card opens everything else: name, cost and color, its sounds, volume, text-to-speech, pause, an image or GIF link for the on-stream card, and delete.
- **Sound pool**: up to 10 sounds per reward (files or myinstants). With more than one, a random one plays each time, never the same one twice in a row.
- **Trim**: drag the start and end on the sound's waveform and play the selection before saving. The file isn't changed; OBS plays just that part.
- **Image or GIF**: paste an https link (Giphy, Tenor, Imgur…). OBS loads it from that site, so it takes no space on the server.
- Rewards created in the Kick dashboard keep their name, cost and color on Kick; only their sound is managed here. They must have **Skip reward requests queue** turned on in Kick, so viewers' redemptions play right away and nothing is read before you approve it.
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
- **Queue**: while OBS is playing, the status bar shows the current sound and how many are waiting. Tap it to see the list and remove any one of them.
- **Skip current sound** and **Clear queue**.

### Statistics

Total redemptions and points spent, a 30-day chart, and the top 10 rewards and viewers. Kept in the streamer's own file (the last 30 days, and at most 300 viewers).

### Public sound list

Off by default. When turned on in Settings, `/c/<kick name>` lists the streamer's active rewards with their cost, and anyone can listen to each sound (trimmed as on stream). These pages are added to `sitemap.xml`.

### Backup and restore

**Download backup** saves one JSON file with every reward, its sounds (inside the file), trims, images and the settings. **Restore from backup** adds the rewards from the file that aren't there yet, creating them on Kick again (or reusing a Kick reward with the same name), then applies the settings.

### Settings

| Setting | What it does |
|---|---|
| Master volume | Scales every sound |
| Max sound length | Cuts sounds after N seconds (0 = no limit) |
| Even out loudness | Turns down sounds that are much louder than the rest |
| Show who redeemed it on stream | The on-stream card with the viewer's name and message |
| Card on stream | Position (top, middle, bottom), dark or light, size and accent color, with a live preview |
| Public sound list | Turns the `/c/<name>` page on or off |
| Text-to-speech voice | Turkish or English |
| Banned words | Comma or line separated |
| Regenerate OBS link | The old link stops working |
| Delete account | Removes the streamer's sounds, settings and the Kick rewards created here |

### Interface

- Turkish and English, from the button in the header (defaults to the browser's language).
- Automatic, light or dark theme from the theme button in the header, also available before logging in.
- Long reward lists show the first 6 with **Show all**.
- Liquid Glass look after [Glisse](https://glisse.kelvinzhang.ca/): a soft coloured backdrop under translucent glass cards, rows, banners and sheets with a specular rim, glass capsule controls that swell, glow and stretch towards the pointer while held, switches you can drag by hand, a floating glass header, menus that grow out of their button, slider and switch thumbs that turn into magnifying lenses while held, and segmented controls whose selection lifts into a lens you can drag to another option. `public/glass.js` draws a displacement map for each glass element and uses it in an SVG filter, so content behind the glass bends at its rim; this needs Chromium, other browsers get frosted glass. To stay light on the GPU, nothing animates in the background, only a few small panes refract, and lenses are only computed while held. Streamers can turn Liquid Glass off in **Settings → Appearance**, which removes every glass filter.
- Respects the system's reduced motion, reduced transparency and increased contrast settings.

### Terms, privacy and cookies

- `/legal` has the Terms of Service, the Privacy Policy (also the KVKK disclosure notice) and the Cookie Policy, in Turkish and English. Your name, email and address come from `LEGAL_NAME`, `LEGAL_EMAIL` and `LEGAL_ADDRESS`. Edit `public/legal.html` to fit your setup and have a lawyer review it; it is a template, not legal advice.
- The login button says that logging in with Kick accepts the terms. The server records the version and time of acceptance per streamer. The version is a hash of the rendered page, so after you edit the page (or the contact details) every streamer sees a banner asking them to accept the new version.
- Access logs (Turkish Law No. 5651): page loads, logins and logouts, and dashboard changes are written to `DATA_DIR/access-logs/<YYYY-MM>.log` with time, IP (from `CF-Connecting-IP` or `X-Forwarded-For` behind a proxy), port, method, path without the query, status and Kick user id. Files older than 12 months are deleted automatically. Polling, OBS, sound and static requests are not logged.
- A cookie banner offers **Reject**, **Only necessary** and **Accept all** with equal weight. There are no analytics or advertising cookies; "Accept all" only adds remembering language and theme in the browser. Logging in needs at least "Only necessary", and the server enforces it.

### Admin panel

Set `ADMIN_KICK_IDS` to your Kick user id (comma-separated for more than one admin). Admins get an **Admin** link in the dashboard header that opens `/admin`, where they can:

- See every streamer: rewards, disk space used by their sounds, redemption count, last redemption, last login, whether OBS is connected, muted or banned.
- Post an **announcement** shown at the top of every streamer's dashboard (e.g. planned maintenance); leave it empty to hide it.
- Set a site-wide **sound storage limit** in MB, and give any streamer their own limit (higher, lower or 0 for none) in their row; an empty field means the site-wide one. Streamers see a usage bar in Settings, and adding a sound that would go over their limit is refused.
- **Download a full site backup**: everything in `DATA_DIR` (streamers, sounds, settings, secrets, access logs) as one `.tar.gz`. To restore, stop the server and run `tar -xzf audiobounty-site-<date>.tar.gz` so the `data/` folder lands where `DATA_DIR` points. Keep the file safe: it contains the session and OBS link secrets and the IP logs.
- See whether Kick webhooks are arriving (count, rejected signatures, last one), total sound storage, memory, uptime and the last 20 server errors.
- **Open** a streamer's dashboard and change anything in it as if they were that streamer. A banner shows whose dashboard is open; changes are marked "(admin)" in their recent activity.
- **Ban** a streamer (they can't log in and their sounds stop playing) or **delete** them (their Kick rewards, sounds and settings are removed).
- Set banned words that apply to every streamer's text-to-speech, and close new sign-ups.

Kick tokens are never sent to the browser, not even to admins. To find your Kick id, log in once and look for `Login: <name> (id <id>)` in the server log (`docker compose logs app`), or check the file names in `DATA_DIR/users/`. Restart the server after changing `ADMIN_KICK_IDS`.

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
| `OVERLAY_SECRET` | Secret OBS links are derived from; generated and stored in the data directory if empty. Changing it changes every OBS link |
| `ADMIN_KICK_IDS` | Kick user ids that can open the admin panel, comma-separated |
| `LEGAL_NAME`, `LEGAL_EMAIL`, `LEGAL_ADDRESS` | You, as the data controller: shown in the terms, privacy notice and cookie policy at `/legal` |

Everything a streamer sets in the dashboard (rewards, volumes, text-to-speech, banned words, favorites, mute) is stored per streamer in `DATA_DIR/users/<id>.json`. Site-wide admin settings are in `DATA_DIR/settings.json`. Language and theme are stored in the browser.

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
- Overlay URLs contain a 144-bit key derived from `OVERLAY_SECRET` and the Kick user id, so a streamer who deletes their account and signs up again gets the same link. Regenerating it from the dashboard kills the old link for good; only the regeneration count is kept (`DATA_DIR/overlay-rotations.json`, about 14 bytes per streamer who ever regenerated).
- Kick tokens are stored server-side only, in `DATA_DIR/users/*.json`. Protect that directory and `.env`.
- The server only downloads sounds from `https://www.myinstants.com/media/sounds/`, without following redirects, so the picker can't be used to make it fetch other addresses.
- Reward colors must be `#rrggbb`; anything else is ignored.
- The admin panel and its API answer 404 to anyone not listed in `ADMIN_KICK_IDS`. Admin actions are written to the server log.
- The OAuth state is bound to the browser that started the login with a short-lived cookie, so a login link can't be handed to someone else.
- Webhooks older than 10 minutes are ignored (replays), and the Kick public key is refetched at most once a minute.
- Each OBS link accepts at most 5 connections; a connection that stops reading is dropped instead of buffering in memory.
- Deleting an account stops if Kick can't remove its rewards (the dashboard offers to delete anyway). Requests still running when an account is deleted can't write it back.
- Sound files no reward uses are removed on startup and after every sound change.

## Project structure

```
server.js                 HTTP server: sessions, webhook, dashboard API, overlay stream,
                          myinstants search and text-to-speech proxy
lib/kick.js               Kick OAuth, API client and webhook signature verification
lib/store.js              JSON file storage (data/users/*.json, data/sounds/<id>/)
public/index.html         Landing page and streamer dashboard
public/admin.html         Admin panel (/admin)
public/style.css          Shared styles for the dashboard and admin panel
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

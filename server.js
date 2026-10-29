import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import { createKick, KickError, REDEMPTION_EVENT, ReloginError } from './lib/kick.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const MAX_SOUND_MB = Number(process.env.MAX_SOUND_MB) || 5;
const MAX_ALERTS = Math.min(Number(process.env.MAX_ALERTS) || 30, 50); // Kick allows at most 50 rewards per channel
const PUBLIC_DIR = path.join(ROOT, 'public');
const SECURE_COOKIE = PUBLIC_URL.startsWith('https://');
const PUBLIC_ORIGIN = new URL(PUBLIC_URL).origin;

const AUDIO_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm',
};
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

if (!process.env.KICK_CLIENT_ID || !process.env.KICK_CLIENT_SECRET) {
  console.error('KICK_CLIENT_ID and KICK_CLIENT_SECRET must be set (see .env.example)');
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const SESSION_SECRET = process.env.SESSION_SECRET || persistentSecret(path.join(DATA_DIR, 'session-secret'));
const store = createStore(DATA_DIR);
const kick = createKick({
  clientId: process.env.KICK_CLIENT_ID,
  clientSecret: process.env.KICK_CLIENT_SECRET,
  redirectUri: `${PUBLIC_URL}/auth/callback`,
  store,
});

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function persistentSecret(file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, s, { mode: 0o600 });
  return s;
}

// Per-streamer activity, shown as "Recent activity" in the dashboard.

const userLogs = new Map();
function ulog(user, msg) {
  const list = userLogs.get(user.id) || [];
  list.push({ t: Date.now(), msg });
  if (list.length > 30) list.shift();
  userLogs.set(user.id, list);
}

const overlays = new Map(); // userId -> Set of open SSE responses

function overlayCount(user) {
  return overlays.get(user.id)?.size || 0;
}

function sendToOverlays(user, payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of overlays.get(user.id) || []) res.write(data);
}

setInterval(() => {
  for (const set of overlays.values()) for (const res of set) res.write(': ping\n\n');
}, 25000);

const TTS_MAX = 200; // Google's TTS endpoint rejects longer text
const TTS_LANGS = ['tr', 'en'];

// shortcut: substring match, so a banned word inside a longer word also blocks; switch to word matching if that bites.
const hasBannedWord = (user, text) => (user.bannedWords || []).some((w) => text.toLocaleLowerCase('tr').includes(w));

function playAlert(user, alert, who, text = '') {
  if (!alert.file && !text) return false;
  const volume = Math.max(0, Math.min(1, (alert.volume ?? 1) * (user.masterVolume ?? 1)));
  sendToOverlays(user, {
    type: 'play',
    url: alert.file ? `/media/${user.overlayKey}/${encodeURIComponent(alert.file)}` : null,
    tts: text ? `/tts/${user.overlayKey}?lang=${user.ttsLang || 'tr'}&text=${encodeURIComponent(text)}` : null,
    text,
    volume,
    reward: alert.title,
    user: who,
    maxDuration: user.maxDuration || 0,
    normalize: Boolean(user.normalize),
    card: user.card !== false,
  });
  return true;
}

const seen = new Map(); // drops events Kick delivers more than once
function alreadySeen(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.set(id, Date.now());
  if (seen.size > 5000) seen.delete(seen.keys().next().value);
  return false;
}

const norm = (s) => String(s || '').trim().toLowerCase();

function handleRedemption(evt) {
  const user = store.get(evt.broadcaster?.user_id);
  if (!user || evt.status === 'rejected') return;
  if (alreadySeen(`r:${evt.id}`)) return;
  const who = evt.redeemer?.username || '';
  const alert =
    user.alerts.find((a) => a.rewardId && a.rewardId === evt.reward?.id) ||
    user.alerts.find((a) => norm(a.title) === norm(evt.reward?.title));
  if (!alert) return;
  if (alert.enabled === false) return;
  if (user.muted) return ulog(user, `${who || 'Someone'} redeemed "${alert.title}" (muted)`);
  let text = '';
  if (alert.tts) {
    text = String(evt.user_input || '').replace(/https?:\/\/\S+/g, '').trim().slice(0, TTS_MAX);
    if (text && hasBannedWord(user, text)) {
      ulog(user, `Message from ${who || 'someone'} was not read: it has a banned word`);
      text = '';
    }
  }
  if (!playAlert(user, alert, who, text)) return;
  ulog(user, `${who || 'Someone'} redeemed "${alert.title}"${overlayCount(user) ? '' : ' (OBS was not connected!)'}`);
}

const SESSION_DAYS = 30;

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function sessionCookie(userId) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const value = `${userId}.${exp}`;
  return cookie('sid', `${value}.${sign(value)}`, SESSION_DAYS * 86400);
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`;
}

function readCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function sessionUser(req) {
  const sid = readCookies(req).sid;
  if (!sid) return null;
  const [id, exp, sig] = sid.split('.');
  const value = `${id}.${exp}`;
  const expected = sign(value);
  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return store.get(id) || null;
}

// Holds the PKCE verifier while the streamer is on Kick's login page (10 min)
const pendingLogins = new Map();
setInterval(() => {
  for (const [k, v] of pendingLogins) if (v.at < Date.now() - 600000) pendingLogins.delete(k);
}, 60000);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, `File is too large (max ${MAX_SOUND_MB} MB)`));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req, Math.ceil(MAX_SOUND_MB * 1024 * 1024 * 1.4) + 4096);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, 'Invalid request');
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

function sendFile(res, file, type) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': type.startsWith('audio/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return origin === PUBLIC_ORIGIN || new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// Validates base64 audio, writes it into the streamer's folder and returns the file name.
function saveSound(user, alertId, sound) {
  const ext = path.extname(String(sound?.name || '')).toLowerCase();
  if (!AUDIO_TYPES[ext]) throw new HttpError(400, 'Sound must be mp3, wav, ogg, m4a, aac or webm');
  const buf = Buffer.from(String(sound.data || ''), 'base64');
  if (!buf.length) throw new HttpError(400, 'Sound file is empty');
  if (buf.length > MAX_SOUND_MB * 1024 * 1024) throw new HttpError(413, `Sound file can be at most ${MAX_SOUND_MB} MB`);
  const name = `${alertId}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(store.soundDir(user), name), buf);
  return name;
}

const MYINSTANTS = 'https://www.myinstants.com';
const unescapeHtml = (s) => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" }[e]));

// shortcut: myinstants has no public API, so this parses its search/trending page HTML; update the regex if their markup changes.
async function searchMyInstants(q) {
  const page = q ? `/en/search/?name=${encodeURIComponent(q)}` : '/en/index/tr/';
  const res = await fetch(MYINSTANTS + page, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res?.ok) throw new HttpError(502, 'myinstants.com is not responding, try again');
  const html = await res.text();
  const results = [];
  for (const m of html.matchAll(/play\('(\/media\/sounds\/[^']+)'[\s\S]*?class="instant-link[^"]*">([^<]*)</g)) {
    results.push({ url: MYINSTANTS + m[1], title: unescapeHtml(m[2].trim()) });
  }
  return results.slice(0, 40);
}

// Downloads a myinstants sound on the server so the streamer never saves it locally. Only myinstants
// sound URLs are accepted, so this can't be used to make the server fetch arbitrary addresses.
function myInstantsUrl(url) {
  let u;
  try { u = new URL(url); } catch { throw new HttpError(400, 'Invalid sound link'); }
  if (u.origin !== MYINSTANTS || !u.pathname.startsWith('/media/sounds/')) throw new HttpError(400, 'Only myinstants.com sounds can be used');
  return u;
}

async function fetchMyInstantsSound(url) {
  const u = myInstantsUrl(url);
  const res = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!res?.ok) throw new HttpError(502, 'Could not get the sound from myinstants.com');
  if (Number(res.headers.get('content-length')) > MAX_SOUND_MB * 1024 * 1024) throw new HttpError(413, `Sound file can be at most ${MAX_SOUND_MB} MB`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { name: decodeURIComponent(path.basename(u.pathname)), data: buf.toString('base64') };
}

// A sound is either an uploaded file ({ name, data }) or a myinstants pick ({ url }).
const resolveSound = (sound) => (sound?.url ? fetchMyInstantsSound(sound.url) : sound);

function removeSound(user, file) {
  if (file) fs.rmSync(path.join(store.soundDir(user), path.basename(file)), { force: true });
}

function validTitle(t) {
  t = String(t || '').trim();
  if (!t) throw new HttpError(400, 'Reward name cannot be empty');
  if (t.length > 50) throw new HttpError(400, 'Reward name can be at most 50 characters');
  return t;
}

function validCost(c) {
  const n = Number(c);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Cost must be a whole number of 1 or more');
  return n;
}

function validVolume(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function meState(user) {
  return {
    user: { id: user.id, name: user.name, avatar: user.avatar },
    needsRelogin: !user.tokens,
    overlayUrl: `${PUBLIC_URL}/overlay/${user.overlayKey}`,
    overlayKey: user.overlayKey,
    overlays: overlayCount(user),
    masterVolume: user.masterVolume ?? 1,
    muted: Boolean(user.muted),
    maxDuration: user.maxDuration || 0,
    normalize: Boolean(user.normalize),
    card: user.card !== false,
    ttsLang: user.ttsLang || 'tr',
    bannedWords: user.bannedWords || [],
    favorites: user.miFavorites || [],
    subscribed: Boolean(user.subscription),
    alerts: user.alerts,
    logs: userLogs.get(user.id) || [],
    limits: { maxSoundMb: MAX_SOUND_MB, maxAlerts: MAX_ALERTS },
  };
}

async function handleApi(req, res, user, p) {
  const m = req.method;

  if (p === '/api/me' && m === 'GET') return sendJson(res, 200, meState(user));

  if (p === '/api/rewards' && m === 'GET') {
    const rewards = await kick.listRewards(user);
    return sendJson(res, 200, {
      rewards: rewards.map((r) => ({ id: r.id, title: r.title, cost: r.cost, enabled: r.is_enabled })),
    });
  }

  if (p === '/api/myinstants' && m === 'GET') {
    const q = new URL(req.url, PUBLIC_URL).searchParams.get('q')?.trim().slice(0, 100);
    return sendJson(res, 200, { results: await searchMyInstants(q) });
  }

  if (p === '/api/myinstants/favorites' && m === 'POST') {
    const b = await readJson(req);
    const url = myInstantsUrl(b.url).href;
    const favs = (user.miFavorites || []).filter((f) => f.url !== url);
    if (b.on) {
      if (favs.length >= 50) throw new HttpError(400, 'You can save at most 50 favorites');
      favs.unshift({ url, title: String(b.title || '').trim().slice(0, 100) || 'Sound' });
    }
    user.miFavorites = favs;
    store.save(user);
    return sendJson(res, 200, meState(user));
  }

  if (p === '/api/alerts' && m === 'POST') {
    const b = await readJson(req);
    if (user.alerts.length >= MAX_ALERTS) throw new HttpError(400, `You can add at most ${MAX_ALERTS} sound rewards`);
    const id = crypto.randomBytes(6).toString('hex');
    const tts = Boolean(b.tts);
    if (!b.sound && !tts) throw new HttpError(400, 'Choose a sound file');
    let alert;
    if (b.rewardId) {
      // Attach a sound to a reward that already exists on Kick
      const reward = (await kick.listRewards(user)).find((r) => r.id === b.rewardId);
      if (!reward) throw new HttpError(404, 'This reward was not found on your Kick channel');
      if (user.alerts.some((a) => a.rewardId === reward.id)) throw new HttpError(400, 'This reward already has a sound');
      alert = { id, rewardId: reward.id, title: reward.title, cost: reward.cost, managed: false, tts };
    } else {
      const title = validTitle(b.title);
      const cost = validCost(b.cost);
      if (user.alerts.some((a) => norm(a.title) === norm(title))) throw new HttpError(400, 'A reward with this name already exists');
      const reward = await kick.createReward(user, {
        title,
        cost,
        description: tts ? '🗣️ Your message is read aloud on stream' : '🔊 Plays a sound on stream',
        is_user_input_required: tts,
        should_redemptions_skip_request_queue: true,
      });
      alert = { id, rewardId: reward?.id, title, cost, managed: true, tts };
    }
    try {
      alert.file = b.sound ? saveSound(user, id, await resolveSound(b.sound)) : null;
    } catch (e) {
      if (alert.managed && alert.rewardId) await kick.deleteReward(user, alert.rewardId).catch(() => {});
      throw e;
    }
    alert.volume = validVolume(b.volume ?? 1);
    alert.enabled = true;
    user.alerts.push(alert);
    store.save(user);
    ulog(user, `Added "${alert.title}"`);
    return sendJson(res, 200, meState(user));
  }

  const am = p.match(/^\/api\/alerts\/([a-f0-9]+)(\/test)?$/);
  if (am) {
    const alert = user.alerts.find((a) => a.id === am[1]);
    if (!alert) throw new HttpError(404, 'Reward not found');

    if (am[2] && m === 'POST') {
      playAlert(user, alert, 'test', alert.tts ? (user.ttsLang === 'en' ? 'This is a test message' : 'Bu bir test mesajı') : '');
      return sendJson(res, 200, { ok: true, overlays: overlayCount(user) });
    }

    if (!am[2] && m === 'PATCH') {
      const b = await readJson(req);
      const kickFields = {};
      if (b.title !== undefined && b.title !== alert.title) kickFields.title = validTitle(b.title);
      if (b.cost !== undefined && Number(b.cost) !== alert.cost) kickFields.cost = validCost(b.cost);
      if (b.enabled !== undefined && Boolean(b.enabled) !== alert.enabled) kickFields.is_enabled = Boolean(b.enabled);
      if (b.tts !== undefined && Boolean(b.tts) !== Boolean(alert.tts)) {
        if (!b.tts && !alert.file && !b.sound) throw new HttpError(400, 'Add a sound before turning off text-to-speech');
        if (alert.managed) kickFields.is_user_input_required = Boolean(b.tts);
        else alert.tts = Boolean(b.tts);
      }
      if (Object.keys(kickFields).length) {
        if (!alert.managed) throw new HttpError(400, 'This reward was created in the Kick dashboard; change its name, cost and status on Kick');
        await kick.updateReward(user, alert.rewardId, kickFields);
        if (kickFields.title) alert.title = kickFields.title;
        if (kickFields.cost) alert.cost = kickFields.cost;
        if ('is_enabled' in kickFields) alert.enabled = kickFields.is_enabled;
        if ('is_user_input_required' in kickFields) alert.tts = kickFields.is_user_input_required;
      }
      if (b.volume !== undefined) alert.volume = validVolume(b.volume);
      if (b.sound) {
        const old = alert.file;
        alert.file = saveSound(user, alert.id, await resolveSound(b.sound));
        removeSound(user, old);
      }
      store.save(user);
      return sendJson(res, 200, meState(user));
    }

    if (!am[2] && m === 'DELETE') {
      if (alert.managed && alert.rewardId) await kick.deleteReward(user, alert.rewardId);
      removeSound(user, alert.file);
      user.alerts = user.alerts.filter((a) => a !== alert);
      store.save(user);
      ulog(user, `Deleted "${alert.title}"`);
      return sendJson(res, 200, meState(user));
    }
  }

  if (p === '/api/settings' && m === 'POST') {
    const b = await readJson(req);
    if (b.masterVolume !== undefined) user.masterVolume = validVolume(b.masterVolume);
    if (b.muted !== undefined) {
      user.muted = Boolean(b.muted);
      if (user.muted) sendToOverlays(user, { type: 'clear' });
      ulog(user, user.muted ? 'All sounds muted' : 'Sounds unmuted');
    }
    if (b.maxDuration !== undefined) user.maxDuration = Math.max(0, Math.min(60, Math.round(Number(b.maxDuration)) || 0));
    if (b.normalize !== undefined) user.normalize = Boolean(b.normalize);
    if (b.card !== undefined) user.card = Boolean(b.card);
    if (b.ttsLang !== undefined && TTS_LANGS.includes(b.ttsLang)) user.ttsLang = b.ttsLang;
    if (b.bannedWords !== undefined) {
      user.bannedWords = [...new Set(String(b.bannedWords).split(/[,\n]/).map((w) => w.trim().toLocaleLowerCase('tr')).filter(Boolean))]
        .slice(0, 200)
        .map((w) => w.slice(0, 40));
    }
    store.save(user);
    return sendJson(res, 200, meState(user));
  }

  if ((p === '/api/overlay/skip' || p === '/api/overlay/clear') && m === 'POST') {
    sendToOverlays(user, { type: p.endsWith('skip') ? 'skip' : 'clear' });
    return sendJson(res, 200, { ok: true, overlays: overlayCount(user) });
  }

  if (p === '/api/overlay/regenerate' && m === 'POST') {
    for (const r of overlays.get(user.id) || []) r.end();
    overlays.delete(user.id);
    store.regenerateOverlayKey(user);
    ulog(user, 'OBS link regenerated; the old link no longer works');
    return sendJson(res, 200, meState(user));
  }

  if (p === '/api/repair' && m === 'POST') {
    await kick.ensureSubscription(user);
    ulog(user, 'Kick connection repaired');
    return sendJson(res, 200, meState(user));
  }

  if (p === '/api/account' && m === 'DELETE') {
    await kick.unsubscribe(user).catch(() => {});
    for (const a of user.alerts) if (a.managed && a.rewardId) await kick.deleteReward(user, a.rewardId).catch(() => {});
    for (const r of overlays.get(user.id) || []) r.end();
    overlays.delete(user.id);
    store.remove(user);
    res.setHeader('Set-Cookie', cookie('sid', '', 0));
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, 'Not found');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  try {
    if (p === '/webhook' && req.method === 'POST') {
      const raw = await readBody(req, 1024 * 1024);
      if (!(await kick.verifyWebhook(req.headers, raw))) {
        res.writeHead(401);
        return res.end();
      }
      res.writeHead(200);
      res.end();
      if (alreadySeen(`m:${req.headers['kick-event-message-id']}`)) return;
      if (req.headers['kick-event-type'] === REDEMPTION_EVENT) handleRedemption(JSON.parse(raw));
      return;
    }

    let m;
    if ((m = p.match(/^\/overlay\/([\w-]+)$/))) {
      if (!store.getByOverlayKey(m[1])) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('This OBS link is not valid. Copy the current link from the dashboard.');
      }
      return sendFile(res, path.join(PUBLIC_DIR, 'overlay.html'), STATIC_TYPES['.html']);
    }

    if ((m = p.match(/^\/events\/([\w-]+)$/))) {
      const user = store.getByOverlayKey(m[1]);
      if (!user) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 3000\n\n');
      if (!overlays.has(user.id)) overlays.set(user.id, new Set());
      overlays.get(user.id).add(res);
      req.on('close', () => overlays.get(user.id)?.delete(res));
      return;
    }

    if ((m = p.match(/^\/tts\/([\w-]+)$/))) {
      // Proxies Google Translate's TTS so OBS gets same-origin audio. shortcut: unofficial endpoint; swap for a paid TTS API if Google blocks it.
      const text = url.searchParams.get('text') || '';
      const lang = url.searchParams.get('lang');
      if (!store.getByOverlayKey(m[1]) || !text || text.length > TTS_MAX || !TTS_LANGS.includes(lang)) throw new HttpError(400, 'Invalid request');
      const r = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (!r?.ok) throw new HttpError(502, 'Text-to-speech is not available right now');
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
      return res.end(buf);
    }

    if ((m = p.match(/^\/media\/([\w-]+)\/([^/]+)$/))) {
      const user = store.getByOverlayKey(m[1]);
      const file = path.basename(decodeURIComponent(m[2]));
      const type = AUDIO_TYPES[path.extname(file).toLowerCase()];
      if (!user || !type) {
        res.writeHead(404);
        return res.end();
      }
      return sendFile(res, path.join(store.soundDir(user), file), type);
    }

    if (p === '/auth/login') {
      const state = crypto.randomBytes(16).toString('base64url');
      const verifier = crypto.randomBytes(32).toString('base64url');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
      pendingLogins.set(state, { verifier, at: Date.now() });
      return redirect(res, kick.authorizeUrl(state, challenge));
    }

    if (p === '/auth/callback') {
      const state = url.searchParams.get('state');
      const pending = pendingLogins.get(state);
      pendingLogins.delete(state);
      const code = url.searchParams.get('code');
      if (!code || !pending) return redirect(res, '/?err=' + encodeURIComponent('Login was cancelled or expired, please try again'));
      try {
        const tokens = await kick.exchangeCode(code, pending.verifier);
        const me = await kick.getMe(tokens);
        const user = store.upsert(me.id, { name: me.name, avatar: me.avatar, tokens });
        try {
          await kick.ensureSubscription(user);
        } catch (e) {
          console.error(`Subscription error (${user.name}): ${e.message}`);
          ulog(user, `Could not subscribe to Kick events: ${e.message}`);
        }
        return redirect(res, '/', { 'Set-Cookie': sessionCookie(user.id) });
      } catch (e) {
        console.error(`Login error: ${e.message}`);
        return redirect(res, '/?err=' + encodeURIComponent(e.message));
      }
    }

    if (p === '/auth/logout' && req.method === 'POST') {
      if (!sameOrigin(req)) throw new HttpError(403, 'Forbidden');
      return redirect(res, '/', { 'Set-Cookie': cookie('sid', '', 0) });
    }

    if (p.startsWith('/api/')) {
      const user = sessionUser(req);
      if (!user) throw new HttpError(401, 'You need to log in');
      if (req.method !== 'GET' && !sameOrigin(req)) throw new HttpError(403, 'Forbidden');
      return await handleApi(req, res, user, p);
    }

    if (p === '/healthz') return sendJson(res, 200, { ok: true, users: store.count() });

    if (req.method === 'GET') {
      const file = p === '/' ? 'index.html' : path.basename(p);
      const type = STATIC_TYPES[path.extname(file)];
      if (type && file !== 'overlay.html') return sendFile(res, path.join(PUBLIC_DIR, file), type);
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    let status = 500;
    let message = e.message;
    if (e instanceof HttpError) status = e.status;
    else if (e instanceof ReloginError) status = 401;
    else if (e instanceof KickError) status = 502;
    else {
      console.error(e);
      message = 'Server error, please try again';
    }
    if (!res.headersSent) sendJson(res, status, { error: message, relogin: e instanceof ReloginError });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Ready: ${PUBLIC_URL}  (port ${PORT}, ${store.count()} streamers)`);
  console.log(`Kick app settings → Redirect URL: ${PUBLIC_URL}/auth/callback  |  Webhook URL: ${PUBLIC_URL}/webhook`);
});

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Each streamer lives in data/users/<kickUserId>.json, their sounds in data/sounds/<kickUserId>/.
// OBS keys are HMAC(overlaySecret, kickId[:n]), so a deleted and re-created account gets its link back.
// n (how many times the link was regenerated) is the only thing kept after deletion, in overlay-rotations.json.
export function createStore(dataDir, overlaySecret) {
  const usersDir = path.join(dataDir, 'users');
  const soundsDir = path.join(dataDir, 'sounds');
  fs.mkdirSync(usersDir, { recursive: true });
  fs.mkdirSync(soundsDir, { recursive: true });

  const rotationsFile = path.join(dataDir, 'overlay-rotations.json');
  let rotations = {};
  try {
    rotations = JSON.parse(fs.readFileSync(rotationsFile, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(`Could not read ${rotationsFile}: ${e.message}`);
  }

  const users = new Map();
  const byOverlayKey = new Map();

  for (const f of fs.readdirSync(usersDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const u = JSON.parse(fs.readFileSync(path.join(usersDir, f), 'utf8'));
      users.set(u.id, u);
      byOverlayKey.set(u.overlayKey, u.id);
    } catch (e) {
      console.error(`Could not read user file ${f}: ${e.message}`);
    }
  }

  // A request still running when its user is deleted holds the old object; it must not write it back.
  const isLive = (u) => users.get(u.id) === u;

  function save(u) {
    if (!isLive(u)) return;
    const file = path.join(usersDir, `${u.id}.json`);
    fs.writeFileSync(file + '.tmp', JSON.stringify(u, null, 2));
    fs.renameSync(file + '.tmp', file);
  }

  function overlayKeyFor(id) {
    const n = rotations[id];
    const msg = n ? `${id}:${n}` : id;
    return crypto.createHmac('sha256', overlaySecret).update(msg).digest('base64url').slice(0, 24);
  }

  return {
    get: (id) => users.get(String(id)),
    all: () => [...users.values()],
    getByOverlayKey: (key) => users.get(byOverlayKey.get(key)),
    count: () => users.size,
    save,

    upsert(id, fields) {
      id = String(id);
      let u = users.get(id);
      if (!u) {
        u = { id, overlayKey: overlayKeyFor(id), alerts: [], masterVolume: 1, createdAt: new Date().toISOString() };
        users.set(id, u);
        byOverlayKey.set(u.overlayKey, id);
      }
      Object.assign(u, fields);
      save(u);
      return u;
    },

    regenerateOverlayKey(u) {
      byOverlayKey.delete(u.overlayKey);
      rotations[u.id] = (rotations[u.id] || 0) + 1;
      fs.writeFileSync(rotationsFile + '.tmp', JSON.stringify(rotations));
      fs.renameSync(rotationsFile + '.tmp', rotationsFile);
      u.overlayKey = overlayKeyFor(u.id);
      byOverlayKey.set(u.overlayKey, u.id);
      save(u);
    },

    remove(u) {
      users.delete(u.id);
      byOverlayKey.delete(u.overlayKey);
      fs.rmSync(path.join(usersDir, `${u.id}.json`), { force: true });
      fs.rmSync(path.join(soundsDir, u.id), { recursive: true, force: true });
    },

    isLive,

    soundDir(u) {
      if (!isLive(u)) throw new Error('This account was deleted');
      const dir = path.join(soundsDir, u.id);
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    },
  };
}

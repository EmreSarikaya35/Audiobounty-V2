import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Each streamer lives in data/users/<kickUserId>.json, their sounds in data/sounds/<kickUserId>/.
export function createStore(dataDir) {
  const usersDir = path.join(dataDir, 'users');
  const soundsDir = path.join(dataDir, 'sounds');
  fs.mkdirSync(usersDir, { recursive: true });
  fs.mkdirSync(soundsDir, { recursive: true });

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

  function save(u) {
    const file = path.join(usersDir, `${u.id}.json`);
    fs.writeFileSync(file + '.tmp', JSON.stringify(u, null, 2));
    fs.renameSync(file + '.tmp', file);
  }

  function newKey() {
    return crypto.randomBytes(18).toString('base64url');
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
        u = { id, overlayKey: newKey(), alerts: [], masterVolume: 1, createdAt: new Date().toISOString() };
        users.set(id, u);
        byOverlayKey.set(u.overlayKey, id);
      }
      Object.assign(u, fields);
      save(u);
      return u;
    },

    regenerateOverlayKey(u) {
      byOverlayKey.delete(u.overlayKey);
      u.overlayKey = newKey();
      byOverlayKey.set(u.overlayKey, u.id);
      save(u);
    },

    remove(u) {
      users.delete(u.id);
      byOverlayKey.delete(u.overlayKey);
      fs.rmSync(path.join(usersDir, `${u.id}.json`), { force: true });
      fs.rmSync(path.join(soundsDir, u.id), { recursive: true, force: true });
    },

    soundDir(u) {
      const dir = path.join(soundsDir, u.id);
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    },
  };
}

import crypto from 'node:crypto';

const KICK_ID = 'https://id.kick.com';
const KICK_API = 'https://api.kick.com/public/v1';
export const REDEMPTION_EVENT = 'channel.reward.redemption.updated';
export const SCOPES = 'user:read channel:read channel:rewards:read channel:rewards:write events:subscribe';

export class KickError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// The streamer revoked access or the refresh token is gone; they have to log in again.
export class ReloginError extends Error {}

function errorText(text) {
  try {
    const j = JSON.parse(text);
    if (typeof j.data === 'string' && j.data) return j.data;
    return j.message || j.error_description || j.error || text;
  } catch {
    return text;
  }
}

export function createKick({ clientId, clientSecret, redirectUri, store }) {
  async function tokenRequest(params) {
    const res = await fetch(`${KICK_ID}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    });
    const text = await res.text();
    if (!res.ok) throw new KickError(`Kick token error (${res.status}): ${errorText(text)}`, res.status);
    return JSON.parse(text);
  }

  function toTokens(t, previousRefresh) {
    return {
      access: t.access_token,
      refresh: t.refresh_token || previousRefresh,
      expiresAt: Date.now() + (t.expires_in || 3600) * 1000,
    };
  }

  const refreshing = new Map(); // never run two refreshes for the same user at once

  async function accessToken(user) {
    if (!user.tokens) throw new ReloginError('Not connected to Kick');
    if (Date.now() < user.tokens.expiresAt - 60000) return user.tokens.access;
    if (!refreshing.has(user.id)) {
      refreshing.set(
        user.id,
        tokenRequest({ grant_type: 'refresh_token', refresh_token: user.tokens.refresh })
          .then((t) => {
            user.tokens = toTokens(t, user.tokens.refresh);
            store.save(user);
          })
          .catch((e) => {
            if (e.status === 400 || e.status === 401) {
              user.tokens = null;
              store.save(user);
              throw new ReloginError('Your Kick connection expired, please log in again');
            }
            throw e;
          })
          .finally(() => refreshing.delete(user.id))
      );
    }
    await refreshing.get(user.id);
    return user.tokens.access;
  }

  // `who` is a user, or { access } right after login when no user record exists yet
  async function api(who, method, endpoint, body) {
    const token = who.access || (await accessToken(who));
    const res = await fetch(`${KICK_API}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (res.status === 401 && !who.access) {
      who.tokens = null;
      store.save(who);
      throw new ReloginError('Your Kick connection is no longer valid, please log in again');
    }
    if (!res.ok) throw new KickError(`Kick: ${errorText(text)} (${res.status})`, res.status);
    return text ? JSON.parse(text) : null;
  }

  let publicKeyPem = null;
  async function fetchPublicKey() {
    const res = await fetch(`${KICK_API}/public-key`);
    const json = await res.json();
    publicKeyPem = json?.data?.public_key || json?.public_key;
    if (!publicKeyPem) throw new Error('Could not fetch the Kick public key');
    return publicKeyPem;
  }

  function checkSignature(pem, headers, rawBody) {
    const signed = `${headers['kick-event-message-id']}.${headers['kick-event-message-timestamp']}.${rawBody}`;
    return crypto.createVerify('RSA-SHA256').update(signed).verify(pem, String(headers['kick-event-signature']), 'base64');
  }

  return {
    authorizeUrl(state, challenge) {
      const q = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: SCOPES,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return `${KICK_ID}/oauth/authorize?${q}`;
    },

    async exchangeCode(code, verifier) {
      const t = await tokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });
      return toTokens(t);
    },

    async getMe(tokens) {
      const me = await api({ access: tokens.access }, 'GET', '/users');
      const u = me?.data?.[0];
      if (!u) throw new KickError('Could not load the Kick user');
      return { id: String(u.user_id), name: u.name, avatar: u.profile_picture || '' };
    },

    async ensureSubscription(user) {
      // The app's subscriptions for every streamer share one list; only look at this streamer's.
      const list = await api(user, 'GET', `/events/subscriptions?broadcaster_user_id=${encodeURIComponent(user.id)}`);
      const mine = (list?.data || []).filter(
        (s) =>
          (s.event || s.name) === REDEMPTION_EVENT &&
          (s.broadcaster_user_id == null || String(s.broadcaster_user_id) === user.id)
      );
      if (mine.length) {
        user.subscription = { id: mine[0].id, at: user.subscription?.at || new Date().toISOString() };
      } else {
        const r = await api(user, 'POST', '/events/subscriptions', {
          events: [{ name: REDEMPTION_EVENT, version: 1 }],
          method: 'webhook',
        });
        const item = r?.data?.[0];
        if (item?.error) throw new KickError(`Kick: ${item.error}`);
        user.subscription = { id: item?.subscription_id, at: new Date().toISOString() };
      }
      store.save(user);
    },

    async unsubscribe(user) {
      if (user.subscription?.id) {
        await api(user, 'DELETE', `/events/subscriptions?id=${encodeURIComponent(user.subscription.id)}`);
      }
    },

    async listRewards(user) {
      const r = await api(user, 'GET', '/channels/rewards');
      return r?.data || [];
    },

    async createReward(user, fields) {
      const r = await api(user, 'POST', '/channels/rewards', fields);
      return r?.data;
    },

    async updateReward(user, id, fields) {
      const r = await api(user, 'PATCH', `/channels/rewards/${encodeURIComponent(id)}`, fields);
      return r?.data;
    },

    async deleteReward(user, id) {
      try {
        await api(user, 'DELETE', `/channels/rewards/${encodeURIComponent(id)}`);
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    },

    async verifyWebhook(headers, rawBody) {
      if (!headers['kick-event-signature']) return false;
      if (checkSignature(publicKeyPem || (await fetchPublicKey()), headers, rawBody)) return true;
      return checkSignature(await fetchPublicKey(), headers, rawBody); // Kick may have rotated its key
    },
  };
}

// Authenticated Riot calls to fetch a player's storefront from a saved ssid cookie.
// Flow adapted from samsepi0l-1337/valorant-bot; written fresh in JavaScript.
const https = require('node:https');

const VP_UUID = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
const CLIENT_PLATFORM =
	'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
const FALLBACK_CLIENT_VERSION = 'release-13.02-shipping-10-5229475';

// ---- Reauth: ssid cookie -> access + id tokens (uses https to read the redirect) ----

function parseRedirect(rawUrl) {
	const u = new URL(rawUrl);
	const frag = new URLSearchParams(u.hash.replace(/^#/, ''));
	const access = frag.get('access_token') || u.searchParams.get('access_token');
	const id = frag.get('id_token') || u.searchParams.get('id_token');
	if (!access) throw new Error('reauth: no access_token (session likely expired)');
	return { accessToken: access, idToken: id };
}

function reauth(ssidCookie) {
	const url =
		'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid';
	return new Promise((resolve, reject) => {
		const req = https.request(url, { method: 'GET', headers: { Cookie: ssidCookie } }, (res) => {
			res.resume(); // drain the body, we only need the Location header
			const loc = res.headers.location;
			if (!loc) {
				reject(new Error('reauth: no redirect (session likely expired)'));
				return;
			}
			try {
				resolve(parseRedirect(loc));
			} catch (err) {
				reject(err);
			}
		});
		req.on('error', reject);
		req.end();
	});
}

// ---- Reading the token (no network needed) ----

function jwtPayload(token) {
	const parts = token.split('.');
	if (parts.length < 2) throw new Error('invalid token');
	return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

function puuidFromToken(token) {
	const sub = jwtPayload(token).sub;
	if (!sub) throw new Error('token has no puuid');
	return sub;
}

function shardFromToken(token) {
	const raw = (jwtPayload(token).dat || {}).r || '';
	const r = String(raw).toLowerCase().trim();
	if (['na', 'na1'].includes(r)) return 'na';
	if (['latam', 'br'].includes(r)) return 'na';
	if (['eu', 'euw', 'euw1', 'eun', 'eun1', 'ru', 'tr'].includes(r)) return 'eu';
	if (['ap', 'ap1', 'asia', 'apac', 'sea'].includes(r)) return 'ap';
	if (['kr', 'kr1'].includes(r)) return 'kr';
	throw new Error(`unknown region in token: ${raw}`);
}

// ---- Entitlements token ----

async function getEntitlements(accessToken) {
	const resp = await fetch('https://entitlements.auth.riotgames.com/api/token/v1', {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		body: '{}',
	});
	if (!resp.ok) throw new Error(`entitlements failed: ${resp.status}`);
	const json = await resp.json();
	if (!json.entitlements_token) throw new Error('entitlements: empty token');
	return json.entitlements_token;
}

// ---- Current client version (so Riot accepts the store request) ----

async function getClientVersion() {
	try {
		const resp = await fetch('https://valorant-api.com/v1/version');
		const json = await resp.json();
		return json.data.riotClientVersion || FALLBACK_CLIENT_VERSION;
	} catch {
		return FALLBACK_CLIENT_VERSION;
	}
}

// ---- The storefront ----

async function getStorefront(accessToken, entitlements, shard, puuid, clientVersion) {
	const resp = await fetch(`https://pd.${shard}.a.pvp.net/store/v3/storefront/${puuid}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'X-Riot-Entitlements-JWT': entitlements,
			'X-Riot-ClientPlatform': CLIENT_PLATFORM,
			'X-Riot-ClientVersion': clientVersion,
			'Content-Type': 'application/json',
		},
		body: '{}',
	});
	if (!resp.ok) throw new Error(`storefront failed: ${resp.status}`);
	const json = await resp.json();

	const layout = json.SkinsPanelLayout || {};
	const remaining = layout.SingleItemOffersRemainingDurationInSeconds || layout.RemainingDurationInSeconds || 0;

	const offers = [];
	if (Array.isArray(layout.SingleItemStoreOffers) && layout.SingleItemStoreOffers.length > 0) {
		for (const o of layout.SingleItemStoreOffers) {
			const id = o.OfferID || o.ItemID || (o.Rewards && o.Rewards[0] && o.Rewards[0].ItemID) || '';
			const cost = o.Cost ? o.Cost[VP_UUID] || 0 : 0;
			offers.push({ skinUuid: id, costVp: cost });
		}
	} else if (Array.isArray(layout.SingleItemOffers)) {
		for (const id of layout.SingleItemOffers) {
			if (id) offers.push({ skinUuid: id, costVp: 0 });
		}
	}

	return { remainingSeconds: remaining, offers: offers };
}

// ---- The one function the bot calls ----

async function getStore(ssidCookie) {
	const { accessToken } = await reauth(ssidCookie);
	const entitlements = await getEntitlements(accessToken);
	const puuid = puuidFromToken(accessToken);
	const shard = shardFromToken(accessToken);
	const clientVersion = await getClientVersion();
	return getStorefront(accessToken, entitlements, shard, puuid, clientVersion);
}

module.exports = { getStore };
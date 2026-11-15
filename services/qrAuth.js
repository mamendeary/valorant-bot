// Riot Mobile QR login. The request flow is adapted from the open-source
// bot samsepi0l-1337/valorant-bot; this is our own JavaScript version.
// It talks straight to Riot's QR endpoints — no library, no hosting.
const crypto = require('node:crypto');

const AUTH_BASE = 'https://auth.riotgames.com';
const AUTHENTICATE_BASE = 'https://authenticate.riotgames.com';
const QRLOGIN_BASE = 'https://qrlogin.riotgames.com';
const USER_AGENT = 'RiotGamesApi/24.9.1.4445 rso-authenticator (Windows;10;;Professional, x64) riot_client/0';
const LANGUAGE = 'en_US';
const REDIRECT_URI = 'http://localhost/redirect';
const SCOPE = 'openid link ban lol_region account';

function randomHex(n) {
	return crypto.randomBytes(n).toString('hex');
}

// A tiny cookie jar: name -> value, updated from each response's Set-Cookie.
function mergeSetCookie(jar, response) {
	const lines = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
	for (const line of lines) {
		const first = line.split(';')[0];
		const eq = first.indexOf('=');
		if (eq === -1) continue;
		const name = first.slice(0, eq).trim();
		const value = first.slice(eq + 1).trim();
		if (value === '') {
			delete jar[name];
		} else {
			jar[name] = value;
		}
	}
}

function cookieHeader(jar) {
	return Object.keys(jar).sort().map((n) => `${n}=${jar[n]}`).join('; ');
}

// One request that carries our cookies and never follows redirects.
async function riotFetch(method, url, body, session) {
	const headers = {
		Accept: 'application/json',
		'User-Agent': USER_AGENT,
		baggage: `sdksid=${session.sdkSID}`,
	};
	if (body) headers['Content-Type'] = 'application/json';
	const cookie = cookieHeader(session.cookies);
	if (cookie) headers['Cookie'] = cookie;

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
		redirect: 'manual',
	});
	mergeSetCookie(session.cookies, response);
	return response;
}

// Step 1: ask Riot for a QR login and build the URL the phone scans.
async function startQRSession() {
	const session = { cookies: {}, sdkSID: randomHex(16) };

	const discovery = await riotFetch('GET', `${AUTH_BASE}/.well-known/openid-configuration`, null, session);
	await discovery.text();

	const body = { client_id: 'riot-client', language: LANGUAGE, platform: 'windows', remember: false, type: 'auth', qrcode: {} };
	const resp = await riotFetch('POST', `${AUTHENTICATE_BASE}/api/v1/login`, body, session);
	if (resp.status !== 200) {
		throw new Error(`QR start failed: ${resp.status}`);
	}
	const out = await resp.json();
	if (!out.cluster || !out.suuid || out.timestamp === undefined) {
		throw new Error('QR start: Riot returned no QR session');
	}

	const q = new URLSearchParams({
		cluster: out.cluster,
		suuid: String(out.suuid),
		timestamp: String(out.timestamp),
		utm_source: 'riotclient',
		utm_medium: 'client',
		utm_campaign: 'qrlogin-riotmobile',
	});
	session.loginURL = `${QRLOGIN_BASE}/riotmobile?${q.toString()}`;
	return session;
}

// Step 2: check once whether the QR was approved. Returns a login token, or null if still waiting.
async function pollQRSession(session) {
	const resp = await riotFetch('GET', `${AUTHENTICATE_BASE}/api/v1/login`, null, session);
	if (resp.status === 404 || resp.status === 410) throw new Error('QR expired');
	if (resp.status !== 200) throw new Error(`QR poll failed: ${resp.status}`);
	const out = await resp.json();
	if (out.type === 'success') {
		if (!out.success || !out.success.login_token) throw new Error('QR success without login_token');
		return out.success.login_token;
	}
	if (out.type === 'error') throw new Error('QR expired');
	return null;
}

// Step 3: turn an approved login token into a saved ssid session cookie.
async function exchangeLoginToken(loginToken) {
	const session = { cookies: {}, sdkSID: randomHex(16) };

	const tokenBody = { authentication_type: null, code_verifier: '', login_token: loginToken, persist_login: true };
	const tokenResp = await riotFetch('POST', `${AUTH_BASE}/api/v1/login-token`, tokenBody, session);
	await tokenResp.text();
	if (tokenResp.status !== 204 && tokenResp.status !== 200) {
		throw new Error(`login-token failed: ${tokenResp.status}`);
	}

	const authzBody = {
		acr_values: '', claims: '', client_id: 'riot-client',
		code_challenge: '', code_challenge_method: '', nonce: randomHex(16),
		redirect_uri: REDIRECT_URI, response_type: 'token id_token', scope: SCOPE,
	};
	const authzResp = await riotFetch('POST', `${AUTH_BASE}/api/v1/authorization`, authzBody, session);
	if (authzResp.status !== 200) throw new Error(`authorization failed: ${authzResp.status}`);
	await authzResp.json();

	const ssid = session.cookies['ssid'];
	if (!ssid) throw new Error('authorization: no ssid cookie returned');
	return `ssid=${ssid}`;
}

module.exports = { startQRSession, pollQRSession, exchangeLoginToken };
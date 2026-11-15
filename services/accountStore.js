// Saves one encrypted Riot session per Discord user, in data/accounts.json

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const dataFolder = path.join(__dirname, '..', 'data');
const filePath = path.join(dataFolder, 'accounts.json');
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// ---- Encryption (a standard recipe: AES-256-GCM) ----

function encrypt(text) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(stored) {
	const parts = stored.split(':');
	const iv = Buffer.from(parts[0], 'hex');
	const tag = Buffer.from(parts[1], 'hex');
	const encrypted = Buffer.from(parts[2], 'hex');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ---- Reading and writing the file ----

function loadAll() {
	if (!fs.existsSync(filePath)) {
		return {};
	}
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveAll(accounts) {
	fs.mkdirSync(dataFolder, { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2));
}

// ---- The three functions the rest of the bot uses ----

function saveAccount(discordUserId, session) {
	const accounts = loadAll();
	accounts[discordUserId] = encrypt(session);
	saveAll(accounts);
}

function getAccount(discordUserId) {
	const accounts = loadAll();
	if (!accounts[discordUserId]) {
		return null;
	}
	return decrypt(accounts[discordUserId]);
}

function removeAccount(discordUserId) {
	const accounts = loadAll();
	delete accounts[discordUserId];
	saveAll(accounts);
}

module.exports = { saveAccount, getAccount, removeAccount };
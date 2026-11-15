const { getAccount } = require('./accountStore');
const { findSkinImage } = require('./skinData');

async function getShop(userId) {
	// No saved session for this user: they haven't linked yet
	const session = getAccount(userId);
	if (session === null) {
		return null;
	}

	// Placeholder reset time: the next midnight UTC
	const now = new Date();
	const resetDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);

	// Sample skins for now — real shop data replaces this next
	const skins = [
		{ name: "Gaia's Vengeance Vandal", price: 1775, tier: 'premium' },
		{ name: 'Magepunk Ares', price: 1775, tier: 'premium' },
		{ name: 'Convex Operator', price: 875, tier: 'select' },
		{ name: 'Smite Judge', price: 875, tier: 'select' },
	];

	// Look up the picture for each skin
	for (const skin of skins) {
		skin.image = await findSkinImage(skin.name);
	}

	return {
		resetDate: resetDate,
		skins: skins,
	};
}

module.exports = { getShop };
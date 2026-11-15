// Where shop data comes from.
// Fake for now. Later, only the inside of this function changes.
async function getShop(userId) {
	// Placeholder reset time: the next midnight UTC
	const now = new Date();
	const resetDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);

	return {
		resetDate: resetDate,
		skins: [
			{ name: "Gaia's Vengeance Vandal", price: 1775 },
			{ name: 'Magepunk Ares', price: 1775 },
			{ name: 'Convex Operator', price: 875 },
			{ name: 'Smite Judge', price: 875 },
		],
	};
}

module.exports = { getShop };
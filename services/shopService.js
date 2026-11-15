const { getAccount } = require('./accountStore');
const { getStore } = require('./valorantApi');
const { getSkinByOfferId } = require('./skinData');

async function getShop(userId) {
	const session = getAccount(userId);
	if (session === null) {
		return null;
	}

	// Fetch the real store (throws if the session expired)
	const store = await getStore(session);

	// Reset time: now plus however long Riot says is left
	const resetDate = Date.now() + store.remainingSeconds * 1000;

	// Turn each offer UUID into a named, priced card
	const skins = [];
	for (const offer of store.offers) {
		const info = await getSkinByOfferId(offer.skinUuid);
		skins.push({
			name: info.name,
			price: offer.costVp,
			tier: info.tier,
			image: info.image,
		});
	}

	return { resetDate: resetDate, skins: skins };
}

module.exports = { getShop };
// Skin names, pictures, and tiers from the community site valorant-api.com.

let skinCache = null;
let tierCache = null;

async function getAllSkins() {
	if (skinCache === null) {
		const res = await fetch('https://valorant-api.com/v1/weapons/skins');
		const json = await res.json();
		skinCache = json.data;
	}
	return skinCache;
}

async function getAllTiers() {
	if (tierCache === null) {
		const res = await fetch('https://valorant-api.com/v1/contenttiers');
		const json = await res.json();
		tierCache = json.data;
	}
	return tierCache;
}

// Map a storefront offer UUID (which is a skin "level" id) to display info.
async function getSkinByOfferId(offerId) {
	const skins = await getAllSkins();

	let found = null;
	for (const skin of skins) {
		if (skin.uuid === offerId) {
			found = skin;
			break;
		}
		if (Array.isArray(skin.levels)) {
			for (const level of skin.levels) {
				if (level.uuid === offerId) {
					found = skin;
					break;
				}
			}
		}
		if (found) break;
	}

	if (!found) {
		return { name: 'Unknown skin', image: null, tier: null };
	}

	// Tier: look up the content tier's short name (e.g. "Premium" -> "premium")
	let tier = null;
	if (found.contentTierUuid) {
		const tiers = await getAllTiers();
		for (const t of tiers) {
			if (t.uuid === found.contentTierUuid) {
				tier = t.devName.toLowerCase();
				break;
			}
		}
	}

	const image = found.displayIcon || (found.levels && found.levels[0] && found.levels[0].displayIcon) || null;
	return { name: found.displayName, image: image, tier: tier };
}

module.exports = { getSkinByOfferId };
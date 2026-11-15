// Skin names and pictures from the community site valorant-api.com

// We download the list once and remember it here
let skinCache = null;

async function getAllSkins() {
	if (skinCache === null) {
		const response = await fetch('https://valorant-api.com/v1/weapons/skins');
		const json = await response.json();
		skinCache = json.data;
	}
	return skinCache;
}

// Given a skin's name, return the link to its picture (or null if not found)
async function findSkinImage(name) {
	const skins = await getAllSkins();
	let skin = undefined;

	for (const s of skins) {
		if (s.displayName === name) {
			skin = s;
			break;
		}
	}

	if (!skin) {
		return null;
	}
	return skin.displayIcon || skin.levels[0].displayIcon;
}

module.exports = { findSkinImage };
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShop } = require('../../services/shopService');
const emojis = require('../../config/emojis');

module.exports = {
	data: new SlashCommandBuilder().setName('shop').setDescription('Valorant Shop'),
	async execute(interaction) {
		// Fetching the real store takes a few seconds, so ask Discord to wait
		await interaction.deferReply();

		let shop;
		try {
			shop = await getShop(interaction.user.id);
		} catch (err) {
			console.error(err);
			await interaction.editReply('Could not load your shop. Your session may have expired — run /link again.');
			return;
		}

		if (shop === null) {
			await interaction.editReply('Link your Riot account first with /link.');
			return;
		}

		const resetSeconds = Math.floor(shop.resetDate / 1000);
		const millisecondsLeft = shop.resetDate - Date.now();
		const hoursLeft = Math.ceil(millisecondsLeft / (1000 * 60 * 60));

		const header = new EmbedBuilder()
			.setColor(0xFA4454)
			.setDescription(`Daily store for ${interaction.user}\nResets in ${hoursLeft} hours (<t:${resetSeconds}:t>)`);

		const embeds = [header];

		for (const skin of shop.skins) {
			const tierEmoji = skin.tier && emojis[skin.tier] ? `${emojis[skin.tier]} ` : '';

			const card = new EmbedBuilder()
				.setColor(0x16E1D0)
				.setAuthor({ name: 'Valorant Shop', iconURL: interaction.client.user.displayAvatarURL() })
				.setTitle(`${tierEmoji}${skin.name}`)
				.setDescription(`${emojis.vp} ${skin.price}`)
				.setFooter({ text: 'Valorant Shop Bot' });

			if (skin.image) {
				card.setThumbnail(skin.image);
			}

			embeds.push(card);
		}

		await interaction.editReply({ embeds: embeds });
	},
};
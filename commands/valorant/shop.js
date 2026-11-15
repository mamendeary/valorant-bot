const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { getShop } = require('../../services/shopService');
const emojis = require('../../config/emojis');

module.exports = {
	data: new SlashCommandBuilder().setName('shop').setDescription('Valorant Shop'),
	async execute(interaction) {

		const shop = await getShop(interaction.user.id);
		
		if (shop === null) {
			await interaction.reply({ content: 'Link your Riot account first with /link.', flags: MessageFlags.Ephemeral });
			return;
		}

		const resetSeconds = Math.floor(shop.resetDate / 1000);

		// How many hours from now until the reset
		const millisecondsLeft = shop.resetDate - new Date();
		const hoursLeft = Math.ceil(millisecondsLeft / (1000 * 60 * 60));

		// The header box
		const header = new EmbedBuilder()
			.setColor(0xFA4454)
			.setDescription(`Daily store for ${interaction.user}\nResets in ${hoursLeft} hours (<t:${resetSeconds}:t>)`);
		
		// Start the list with the header, then add one card per skin
		const embeds = [header];

		for (const skin of shop.skins) {
			const card = new EmbedBuilder()
				.setColor(0x16E1D0)
				.setAuthor({ name: 'Valorant Shop', iconURL: interaction.client.user.displayAvatarURL() })
				.setTitle(`${emojis[skin.tier]} ${skin.name}`)
				.setDescription(`${emojis.vp} ${skin.price}`)
				.setFooter({ text: 'Valorant Shop Bot' });

			if (skin.image) {
				card.setThumbnail(skin.image);
			}

			embeds.push(card);
		}

		await interaction.reply({ embeds: embeds });
	},
};
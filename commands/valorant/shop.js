const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('shop').setDescription('Valorant Shop'),
	async execute(interaction) {
		const now = new Date();
		const resetDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
		const resetSeconds = Math.floor(resetDate / 1000);

		// How many hours from now until the reset
		const millisecondsLeft = resetDate - now;
		const hoursLeft = Math.ceil(millisecondsLeft / (1000 * 60 * 60));

		// The header box
		const header = new EmbedBuilder()
			.setColor(0xFA4454)
			.setDescription(`Daily store for ${interaction.user}\nResets in ${hoursLeft} hours (<t:${resetSeconds}:t>)`);
		
		await interaction.reply({ embeds: [header] });
	},
};
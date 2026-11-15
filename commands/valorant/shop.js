const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('shop').setDescription('Valorant Shop'),
	async execute(interaction) {
		await interaction.reply('');
	},
};
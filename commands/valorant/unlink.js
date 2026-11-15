const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { removeAccount } = require('../../services/accountStore');

module.exports = {
	data: new SlashCommandBuilder().setName('unlink').setDescription('Delete your saved Riot session from this bot'),
	async execute(interaction) {
		removeAccount(interaction.user.id);
		await interaction.reply({ content: 'Your saved session has been deleted.', flags: MessageFlags.Ephemeral });
	},
};
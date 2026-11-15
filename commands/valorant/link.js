const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const QRCode = require('qrcode');
const { startQRSession, pollQRSession, exchangeLoginToken } = require('../../services/qrAuth');
const { saveAccount } = require('../../services/accountStore');

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
	data: new SlashCommandBuilder().setName('link').setDescription('Link your Riot account by scanning a QR code'),
	async execute(interaction) {
		// Start a QR login
		let session;
		try {
			session = await startQRSession();
		} catch (err) {
			console.error(err);
			await interaction.reply({ content: 'Could not start a Riot login right now. Try again later.', flags: MessageFlags.Ephemeral });
			return;
		}

		// Turn the login URL into a QR image and show it
		const qrImage = await QRCode.toBuffer(session.loginURL);
		const file = new AttachmentBuilder(qrImage, { name: 'qr.png' });

		const instructions = [
			'**Link your Riot account**',
			'Open the **Riot Mobile** app, tap its QR scan button, and scan this code to approve.',
			'This bot is unofficial and not endorsed by Riot — use at your own risk. Only your session is stored, never your password. Run `/unlink` anytime.',
			'',
			'_Waiting for you to approve… (about 2 minutes)_',
		].join('\n');

		await interaction.reply({ content: instructions, files: [file], flags: MessageFlags.Ephemeral });

		// Poll until approved or timed out
		let loginToken = null;
		for (let i = 0; i < 40; i++) {
			await sleep(3000);
			try {
				loginToken = await pollQRSession(session);
			} catch (err) {
				await interaction.editReply({ content: 'That QR code expired. Run `/link` again.', attachments: [] });
				return;
			}
			if (loginToken) break;
		}

		if (!loginToken) {
			await interaction.editReply({ content: 'Timed out waiting for approval. Run `/link` again.', attachments: [] });
			return;
		}

		// Exchange the approval for a session and save it
		try {
			const sessionCookie = await exchangeLoginToken(loginToken);
			saveAccount(interaction.user.id, sessionCookie);
		} catch (err) {
			console.error(err);
			await interaction.editReply({ content: 'Approved, but saving failed. Please run `/link` again.', attachments: [] });
			return;
		}

		await interaction.editReply({ content: 'Your account is linked. Try `/shop`.', attachments: [] });
	},
};
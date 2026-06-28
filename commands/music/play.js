const { SlashCommandBuilder } = require('discord.js');
const { startQueue } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Listen to The Comfiest of Kino'),
	async execute(interaction) {
		await startQueue(interaction);
	},
};

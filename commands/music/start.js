const { SlashCommandBuilder } = require('discord.js');
const { startQueue } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Start a shuffled, looping queue of The Comfiest of Kino'),
	async execute(interaction) {
		await startQueue(interaction, { loop: true, shuffle: true });
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { queueMap, resetQueue } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Reset the queue to its default order'),
	async execute(interaction) {
		await resetQueue(interaction, queueMap.get(interaction.guild.id));
	},
};

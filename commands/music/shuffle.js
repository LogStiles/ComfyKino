const { SlashCommandBuilder } = require('discord.js');
const { queueMap, shuffleQueue } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffle the queue'),
	async execute(interaction) {
		await shuffleQueue(interaction, queueMap.get(interaction.guild.id));
	},
};

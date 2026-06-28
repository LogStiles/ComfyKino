const { SlashCommandBuilder } = require('discord.js');
const { queueMap, pauseSong } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pause the current song'),
	async execute(interaction) {
		await pauseSong(interaction, queueMap.get(interaction.guild.id));
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { queueMap, stopSong } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stop playing and clear the queue'),
	async execute(interaction) {
		await stopSong(interaction, queueMap.get(interaction.guild.id));
	},
};

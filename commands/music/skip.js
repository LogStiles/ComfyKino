const { SlashCommandBuilder } = require('discord.js');
const { queueMap, skipSong } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current song'),
	async execute(interaction) {
		await skipSong(interaction, queueMap.get(interaction.guild.id));
	},
};

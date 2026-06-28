const { SlashCommandBuilder } = require('discord.js');
const { queueMap, nowPlayingCmd } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('Display the currently playing song'),
	async execute(interaction) {
		await nowPlayingCmd(interaction, queueMap.get(interaction.guild.id));
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { queueMap, unpauseSong } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unpause')
		.setDescription('Unpause the current song'),
	async execute(interaction) {
		await unpauseSong(interaction, queueMap.get(interaction.guild.id));
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { queueMap, getVolume } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('volume')
		.setDescription('Display the current volume'),
	async execute(interaction) {
		await getVolume(interaction, queueMap.get(interaction.guild.id));
	},
};

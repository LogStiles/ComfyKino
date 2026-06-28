const { SlashCommandBuilder } = require('discord.js');
const { queueMap, adjustVolume } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('adjustvolume')
		.setDescription('Adjust the playback volume by a relative amount')
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount to change volume by (e.g. 10 or -10)')
				.setRequired(true)),
	async execute(interaction) {
		const delta = interaction.options.getInteger('amount');
		await adjustVolume(interaction, queueMap.get(interaction.guild.id), delta);
	},
};

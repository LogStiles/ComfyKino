const { SlashCommandBuilder } = require('discord.js');
const { queueMap, setVolume } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setvolume')
		.setDescription('Set the playback volume')
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Volume percentage (1-100)')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)),
	async execute(interaction) {
		const amount = interaction.options.getInteger('amount');
		await setVolume(interaction, queueMap.get(interaction.guild.id), amount);
	},
};

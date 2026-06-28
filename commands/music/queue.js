const { SlashCommandBuilder } = require('discord.js');
const { queueMap, displayQueue } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Display the current queue')
		.addIntegerOption(option =>
			option.setName('page')
				.setDescription('The page of the queue to display')
				.setMinValue(1)),
	async execute(interaction) {
		const page = interaction.options.getInteger('page') ?? 1;
		await displayQueue(interaction, queueMap.get(interaction.guild.id), page);
	},
};

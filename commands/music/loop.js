const { SlashCommandBuilder } = require('discord.js');
const { queueMap, setLoop } = require('../../lib/musicQueue');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('Toggle looping the queue'),
	async execute(interaction) {
		await setLoop(interaction, queueMap.get(interaction.guild.id));
	},
};

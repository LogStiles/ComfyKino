const { SlashCommandBuilder } = require('discord.js');
const { queueMap, removeSong } = require('../../lib/musicQueue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position in the queue (1 = currently playing)')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        const position = interaction.options.getInteger('position');
        await removeSong(interaction, queueMap.get(interaction.guild.id), position);
    },
};

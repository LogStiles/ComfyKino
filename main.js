const { Client, Intents } = require('discord.js');
const Discord = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] }); 

client.commands = new Discord.Collection(); //map commands to the bot's command files
client.events = new Discord.Collection(); //map Discord events to the bot's event handlers

['command_handler', 'event_handler'].forEach(handler => {
    require(`./handlers/${handler}`)(client, Discord);
});

client.login(process.env.BOT_TOKEN);
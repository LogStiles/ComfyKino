module.exports = {
    name: 'ping',
    aliases: ['p'],
    description: "Pings the bot.",
    execute(message, args, cmd, client, Discord) {
        message.channel.send("pong!");
    }
}
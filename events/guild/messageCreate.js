module.exports = (Discord, client, message) => {
    const prefix = '~'; //all commands start with this prefix
    if(!message.content.startsWith(prefix) || message.author.bot) { //ignore messages that are missing the prefix or are from the bot itself
        return;
    }

    const args = message.content.slice(prefix.length).split(" "); //remove the prefix from the message and split the message into arguments
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(a => a.aliases && a.aliases.includes(commandName)); //get the command (either by the command's name or one of its aliases)
    try {
        command.execute(message, args, commandName, client, Discord); //if the command exists execute it
    } catch (err) {
        message.reply("There was an error while trying to execute this command");
        console.error(err);
    }
}
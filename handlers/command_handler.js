const fs = require('fs');

module.exports = (client, Discord) => {
    const commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.js')); //collect all .js files in the commands folder
    commandFiles.forEach(file => {
        const command = require(`../commands/${file}`);
        if (command.name) {
            client.commands.set(command.name, command); //map each command.js to the commands collection
        }
    });
}
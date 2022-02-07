const fs = require('fs');

module.exports = (client, Discord) => {
    //pass a directory into the load_dir function to load all the event files in it
    const loadDir = (dirs) => {
        const eventFiles = fs.readdirSync(`./events/${dirs}`).filter(file => file.endsWith('.js'));
        eventFiles.forEach(file => {
           const event = require(`../events/${dirs}/${file}`);
           const eventName = file.split('.')[0];
           client.on(eventName, event.bind(null, Discord, client)); 
        })
    }

    ['client', 'guild'].forEach(e => loadDir(e));
}
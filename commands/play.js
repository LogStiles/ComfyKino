const fs = require('fs');
const path = require('path');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const musicPath = __dirname + '/../music/';

const queueMap = new Map(); //Global map that holds the bot's queues across all servers

module.exports = {
    name: 'play',
    aliases: ['skip', 'stop', 'shuffle', 'reset', 'loop', 'pause', 'unpause'], //aliases holds all other commands related to playing audio
    description: 'Listen to The Comfiest of Kino',
    async execute(message, args, commandName, client, Discord) {
        //check if the user is in a voice channel
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send("You need to be in a voice channel first.");
        }
        
        //get the queue for the current server
        const serverQueue = queueMap.get(message.guild.id);
        
        //the play command
        if (commandName === 'play') {
            //construct serverQueue if it does not exist (will not exist for if a video has not been queued)
            if(!serverQueue) {
                const queueConstructor = {
                    voiceChannel: voiceChannel,
                    textChannel: message.channel,
                    connection: null,
                    subscription: null,
                    songs: [],
                    player: createAudioPlayer(),
                    doesLoop: false
                }

                //add our new queue to the queueMap and the songs to the song list
                queueMap.set(message.guild.id, queueConstructor);
                getSongs(queueConstructor);
                message.channel.send(`Queue Initialized`);

                //establish the connection to the voice channel and start playing audio
                try {
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: voiceChannel.guild.id,
                        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                    });
                    queueConstructor.connection = connection;
                    songPlayer(message.guild);
                } catch (err) {
                    queueMap.delete(message.guild.id);
                    message.channel.send("There was an error connecting.");
                    throw err;
                }
            }
            else {//if serverQueue does exist, say the bot is already playing
                message.channel.send(`Um... I'm already playing music sweetie...'`);
            }
        }
        //the skip command
        else if (commandName === "skip") {skipSong(message, serverQueue);}
        //the stop command
        else if (commandName === "stop") {stopSong(message, serverQueue);}
        //the shuffle command
        else if (commandName === "shuffle") {shuffleQueue(message, serverQueue);}
        //the reset command
        else if (commandName === "reset") {resetQueue(message, serverQueue);}
        //the loop command
        else if (commandName === "loop") {setLoop(message, serverQueue);}
        //the pause command
        else if (commandName === "pause") {pauseSong(message, serverQueue);}
        //the unpause function
        else if (commandName === "unpause") {unpauseSong(message, serverQueue);}
    }
}

const getSongs = (serverQueue) => {
    const songFiles = fs.readdirSync(musicPath).filter(file => file.endsWith('.mp3')); //get all mp3 files out of the music folder
    songFiles.forEach(song => { //add the file path for each song to the queue
        serverQueue.songs.push(song);
    });
}

//play the current song on the serverQueue
const songPlayer = async (guild) => {
    const songQueue = queueMap.get(guild.id);

    var song = songQueue.songs[0];
    var songPath = musicPath + song;
    songQueue.subscription = songQueue.connection.subscribe(songQueue.player);
    songQueue.player.play(createAudioResource(songPath)); //play the song
    songQueue.textChannel.send(`Now playing ${song.substring(0,song.length - 4)}`);
    
    songQueue.player.on(AudioPlayerStatus.Idle, async() => { //when the song is done playing
        if (songQueue.songs.length === 0) { //if there is no song to play
            songQueue.connection.destroy(); //leave the channel
            songQueue.player.stop();
            songQueue.subscription.unsubscribe();
            queueMap.delete(guild.id); //remove the queue from the queueMap
            return;
        }

        if (songQueue.doesLoop) {
            songQueue.songs.push(songQueue.songs.shift()); //remove the song from the queue and push it to the end of the queue
        } else {
            songQueue.songs.shift(); //remove the song from the queue
        }
        song = songQueue.songs[0];
        var songPath = musicPath + song; //get the next song
        songQueue.textChannel.send(`Now playing ${song.substring(0,song.length - 4)}`);
        songQueue.player.play(createAudioResource(songPath)); //play the next song
    });
}

//skips the current song in the queue
const skipSong = (message, serverQueue) => {
    const songName = serverQueue.songs[0];    
    //check if the user is in a voice channel
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    //check if there is a song to skip
    if (!serverQueue) {
        return message.channel.send("There are no songs in the queue");
    }
    serverQueue.player.stop(); //stop the song
    //this sends the player into the Idle status, which starts the next song in our async function songPlayer
    message.channel.send(`Skipped ${songName.substring(0, songName.length - 4)}.`);
}

//stops the music bot and destroys the queue
const stopSong = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("In order to stop I need to be playing first.");
    }
    serverQueue.player.stop();
    serverQueue.songs = [];
    serverQueue.connection.destroy(); //leave the channel
    serverQueue.subscription.unsubscribe();
    queueMap.delete(message.guild.id); //remove the queue from the queueMap
    return message.channel.send("Stopped playing and deleted the queue.");
}

//shuffles the list of songs on the serverQueue
const shuffleQueue = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("There is no queue to shuffle.");
    }
    const currSong = [serverQueue.songs[0]]; //exclude the currently playing song, so it doesn't play again'
    const nonPlayingQueue = serverQueue.songs.slice(1) //section off the part of the queue we will be shuffling
    for (let i = nonPlayingQueue.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [nonPlayingQueue[i], nonPlayingQueue[j]] = [nonPlayingQueue[j], nonPlayingQueue[i]]; // swap elements songs[i] and songs[j]
    }
    serverQueue.songs = currSong.concat(nonPlayingQueue); //stitch the newly shuffled queue back together
    return message.channel.send("The queue has been shuffled.");
}

//reset the queue, delete the current queue (except the current song) and replace it with all available songs in their default order
const resetQueue = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("There is no queue to reset.");
    }
    const currSong = [serverQueue.songs[0]]; //exclude the currently playing song, so we can properly remove it when it ends
    serverQueue.songs = [];
    getSongs(serverQueue);
    serverQueue.songs = currSong.concat(serverQueue.songs);
    console.log(serverQueue.songs);
}

//inverts the boolean that decides whether songs will be added to the end of the queue after playing
const setLoop = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("There is no queue to loop.");
    }
    if (serverQueue.doesLoop) {
        serverQueue.doesLoop = false;
        return message.channel.send("The queue is no longer in loop mode.");
    } else {
       serverQueue.doesLoop = true;
       return message.channel.send("The queue is now in loop mode.");
    }
}

//pauses the audio player
const pauseSong = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("There is no queue to pause.");
    }
    if (serverQueue.player._state.status === 'playing') {
        serverQueue.player.pause();
        return message.channel.send("The queue is now paused.");
    } else if (serverQueue.player._state.status === 'paused') {
        return message.channel.send("The queue is already paused.");
    }
}

//unpauses the audio player
const unpauseSong = (message, serverQueue) => {
    if (!message.member.voice.channel) {
        return message.channel.send("You need to be in a voice channel first.");
    }
    if (!serverQueue) {
        return message.channel.send("There is no queue to unpause.");
    }
    if (serverQueue.player._state.status === 'playing') {
        return message.channel.send("The queue is already unpaused.")
    } else if (serverQueue.player._state.status === 'paused') {
        serverQueue.player.unpause();
        return message.channel.send(`The queue is now unpaused. Now playing ${serverQueue.songs[0].substring(0, serverQueue.songs[0].length - 4)}`);
    }
}
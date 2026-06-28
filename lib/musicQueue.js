const fs = require('fs');
const path = require('path');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const musicPath = path.join(__dirname, '..', 'music');

const queueMap = new Map(); //Global map that holds the bot's queues across all servers

const getSongs = (serverQueue) => {
    fs.readdirSync(musicPath, { withFileTypes: true }).filter(dir => dir.isDirectory()) //get all music folders into a list
    .forEach(dir => { //for each music folder
        fs.readdirSync(path.join(musicPath, dir.name)).filter(file => file.endsWith('.mp3') || file.endsWith('.flac')) //get all the songs in the folder
        .forEach(song => {
            serverQueue.songs.push(path.join(musicPath, dir.name, song)); //add each song path to the queue
        });
    });
};

const getSongName = (song) => {
    if (song.endsWith('.mp3')) {
        return song.substring(0, song.length - 4); //remove the ".mp3" from the song's file
    } else if (song.endsWith('.flac')) {
        return song.substring(0, song.length - 5); // remove the ".flac" from the song's file
    }
};

const getSongInfo = (songPath) => {
    //we want to get the song's name and the path of its directory
    const fileDirectory = path.dirname(songPath); //the directory containing the song
    const songName = path.basename(songPath); //get the file name at the end of the file path
    const songInfo = JSON.parse(fs.readFileSync(path.join(fileDirectory, 'info.json'))); //use the common info between all files in the folder as a base
    songInfo.name = songName; //modify the object to include the current song's name
    songInfo.path = path.join(fileDirectory, songName); //modify the object to include the current song's file path
    songInfo.cover = path.join(fileDirectory, 'cover.jpg');
    return songInfo; //return the unique object
};

const getNowPlayingPayload = (song) => {
    const cover = new AttachmentBuilder(song.cover, { name: 'cover.jpg' });
    const nowPlaying = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('Now Playing')
        .setFields({ name: 'Song Name', value: `${getSongName(song.name)}` },
                   { name: 'Song Origin', value: `${song.origin}` },
                   { name: 'Year', value: `${song.year}` },
                   { name: 'Composer(s)', value: `${song.composer}` })
        .setImage('attachment://cover.jpg')
        .setFooter({ text: "Oh baby that's some kino." });
    return { embeds: [nowPlaying], files: [cover] };
};

//play the current song on the serverQueue
const songPlayer = async (guild) => {
    const songQueue = queueMap.get(guild.id);

    songQueue.connection.on('stateChange', (oldState, newState) => {
        console.log(`[musicQueue] connection state: ${oldState.status} -> ${newState.status}`);
    });
    songQueue.connection.on('error', (error) => {
        console.error('[musicQueue] connection error:', error);
    });

    await entersState(songQueue.connection, VoiceConnectionStatus.Ready, 30_000); //wait for the voice connection to actually be ready before subscribing/playing
    songQueue.currSong = getSongInfo(songQueue.songs[0]);
    songQueue.subscription = songQueue.connection.subscribe(songQueue.player);
    console.log('[musicQueue] subscribed:', Boolean(songQueue.subscription), 'connection state:', songQueue.connection.state.status, 'player state:', songQueue.player.state.status);

    songQueue.player.on('stateChange', (oldState, newState) => {
        console.log(`[musicQueue] player state: ${oldState.status} -> ${newState.status}`);
    });
    songQueue.player.on('error', (error) => {
        console.error('[musicQueue] player error:', error);
    });

    songQueue.player.play(createAudioResource(songQueue.currSong.path)); //play the song
    songQueue.textChannel.send(getNowPlayingPayload(songQueue.currSong));

    songQueue.player.on(AudioPlayerStatus.Idle, async () => { //when the song is done playing
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
        songQueue.currSong = getSongInfo(songQueue.songs[0]); //get the next song
        songQueue.textChannel.send(getNowPlayingPayload(songQueue.currSong));
        songQueue.player.play(createAudioResource(songQueue.currSong.path)); //play the next song
    });
};

//starts a new queue and joins the voice channel
const startQueue = async (interaction, { loop = false, shuffle = false } = {}) => {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        return interaction.reply('You need to be in a voice channel first.');
    }

    if (queueMap.get(interaction.guild.id)) {
        return interaction.reply("Um... I'm already playing music sweetie...");
    }

    const queueConstructor = {
        voiceChannel: voiceChannel,
        textChannel: interaction.channel,
        connection: null,
        subscription: null,
        songs: [],
        player: createAudioPlayer(),
        doesLoop: false,
        currSong: null,
    };

    queueMap.set(interaction.guild.id, queueConstructor);
    getSongs(queueConstructor);
    await interaction.reply('Queue Initialized');

    if (loop) {
        queueConstructor.doesLoop = true;
    }
    if (shuffle) {
        shuffleSilentQueue(queueConstructor);
    }

    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            debug: true,
        });
        connection.on('debug', (message) => console.log('[voice debug]', message));
        connection.on('stateChange', (oldState, newState) => {
            if (newState.networking && newState.networking !== oldState.networking) {
                newState.networking.once('close', (code) => console.log('[voice debug] networking closed with code', code));
            }
        });
        queueConstructor.connection = connection;
        songPlayer(interaction.guild).catch(async (err) => {
            console.error('[musicQueue] songPlayer failed:', err);
            queueMap.delete(interaction.guild.id);
            connection.destroy();
            await interaction.followUp('There was an error starting playback.');
        });
    } catch (err) {
        queueMap.delete(interaction.guild.id);
        await interaction.followUp('There was an error connecting.');
        throw err;
    }
};

//skips the current song in the queue
const skipSong = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There are no songs in the queue');
    }
    if (!serverQueue.currSong) {
        return interaction.reply('Still connecting, try again in a moment.');
    }
    const song = serverQueue.currSong;
    serverQueue.player.stop(); //stop the song
    //this sends the player into the Idle status, which starts the next song in our async function songPlayer
    return interaction.reply(`Skipped ${getSongName(song.name)}.`);
};

//reposts the Now Playing embed for the current song
const nowPlayingCmd = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There are no songs in the queue');
    }
    if (!serverQueue.currSong) {
        return interaction.reply('Still connecting, try again in a moment.');
    }
    return interaction.reply(getNowPlayingPayload(serverQueue.currSong));
};

//stops the music bot and destroys the queue
const stopSong = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('In order to stop I need to be playing first.');
    }
    serverQueue.player.stop();
    serverQueue.songs = [];
    serverQueue.connection.destroy(); //leave the channel
    serverQueue.subscription.unsubscribe();
    queueMap.delete(interaction.guild.id); //remove the queue from the queueMap
    return interaction.reply('Stopped playing and deleted the queue.');
};

//shuffles the list of songs on the serverQueue
const shuffleQueue = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to shuffle.');
    }
    if (!serverQueue.currSong) {
        return interaction.reply('Still connecting, try again in a moment.');
    }
    const currSong = [serverQueue.currSong.path]; //exclude the currently playing song, so it doesn't play again
    const nonPlayingQueue = serverQueue.songs.slice(1); //section off the part of the queue we will be shuffling
    for (let i = nonPlayingQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [nonPlayingQueue[i], nonPlayingQueue[j]] = [nonPlayingQueue[j], nonPlayingQueue[i]]; // swap elements songs[i] and songs[j]
    }
    serverQueue.songs = currSong.concat(nonPlayingQueue); //stitch the newly shuffled queue back together
    return interaction.reply('The queue has been shuffled.');
};

//shuffles the list of songs on the serverQueue when there is no song playing yet
const shuffleSilentQueue = (serverQueue) => {
    for (let i = serverQueue.songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]]; // swap elements songs[i] and songs[j]
    }
};

//reset the queue, delete the current queue (except the current song) and replace it with all available songs in their default order
const resetQueue = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to reset.');
    }
    if (!serverQueue.currSong) {
        return interaction.reply('Still connecting, try again in a moment.');
    }
    const currSong = [serverQueue.currSong.path]; //exclude the currently playing song, so we can properly remove it when it ends
    serverQueue.songs = [];
    getSongs(serverQueue);
    serverQueue.songs = currSong.concat(serverQueue.songs);
    return interaction.reply('The queue has been reset.');
};

//inverts the boolean that decides whether songs will be added to the end of the queue after playing
const setLoop = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to loop.');
    }
    if (serverQueue.doesLoop) {
        serverQueue.doesLoop = false;
        return interaction.reply('The queue is no longer in loop mode.');
    } else {
        serverQueue.doesLoop = true;
        return interaction.reply('The queue is now in loop mode.');
    }
};

//pauses the audio player
const pauseSong = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to pause.');
    }
    if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
        serverQueue.player.pause();
        return interaction.reply('The queue is now paused.');
    } else if (serverQueue.player.state.status === AudioPlayerStatus.Paused) {
        return interaction.reply('The queue is already paused.');
    } else {
        return interaction.reply("The queue isn't ready yet, try again in a moment.");
    }
};

//unpauses the audio player
const unpauseSong = (interaction, serverQueue) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to unpause.');
    }
    if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
        return interaction.reply('The queue is already unpaused.');
    } else if (serverQueue.player.state.status === AudioPlayerStatus.Paused) {
        serverQueue.player.unpause();
        return interaction.reply(`The queue is now unpaused. Now playing ${getSongName(serverQueue.currSong.name)}`);
    } else {
        return interaction.reply("The queue isn't ready yet, try again in a moment.");
    }
};

//displays a page of the queue
const displayQueue = async (interaction, serverQueue, pageNum = 1) => {
    if (!interaction.member.voice.channel) {
        return interaction.reply('You need to be in a voice channel first.');
    }
    if (!serverQueue) {
        return interaction.reply('There is no queue to display.');
    }

    const numberOfPages = Math.ceil(serverQueue.songs.length / 5); //each page will display 5 songs
    if (pageNum < 1 || pageNum > numberOfPages) {
        return interaction.reply(`Page ${pageNum} is out of range! The queue is currently ${numberOfPages} pages long.`);
    }

    const queueDisplay = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`The Comfy Queue - Page ${pageNum} of ${numberOfPages}`);
    let songsOfPage = ''; //start with an empty string, we display all of the page's songs with a single string
    for (let i = 0; i < 5; i++) {
        const trueSongNumber = ((pageNum - 1) * 5) + i; //the number of the song when we index from 0
        const displayedSongNumber = trueSongNumber + 1; //the number of the song when we index from 1
        if (displayedSongNumber <= serverQueue.songs.length) { //check that the generated number correlates to a song
            const songName = getSongName(path.basename(serverQueue.songs[trueSongNumber])); //isolate the song name
            const songOrigin = path.basename(path.dirname(serverQueue.songs[trueSongNumber])); //isolate the song's origin folder
            songsOfPage += `${displayedSongNumber}. ${songOrigin} - ${songName}\n`; //add the song name and origin to songsOfPage with a newline character
        }
    }
    queueDisplay.addFields({ name: 'Now Playing', value: `${songsOfPage}` });
    queueDisplay.setFooter({ text: "Oh baby that's some kino." });

    return interaction.reply({ embeds: [queueDisplay] });
};

module.exports = {
    queueMap,
    getSongs,
    getSongName,
    getSongInfo,
    songPlayer,
    startQueue,
    skipSong,
    nowPlayingCmd,
    stopSong,
    shuffleQueue,
    shuffleSilentQueue,
    resetQueue,
    setLoop,
    pauseSong,
    unpauseSong,
    displayQueue,
};

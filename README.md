# ComfyKino

ComfyKino is a Discord bot that plays music in a voice channel. Point it at a folder of MP3s organized by game/soundtrack, run it locally with your own bot token, and queue up some comfy kino with a handful of slash commands.

## Commands

- `/play` — Initializes the queue from your music folder, joins your voice channel, and starts playing.
- `/start` — Same as `/play`, but immediately shuffles the queue and turns on loop mode.
- `/skip` — Skips the current song and moves on to the next one in the queue.
- `/stop` — Stops playback, clears the queue, and leaves the voice channel.
- `/pause` — Pauses the current song.
- `/unpause` — Resumes the current song.
- `/shuffle` — Randomizes the order of the upcoming queue (the current song keeps playing).
- `/reset` — Resets the queue back to its default folder order (keeping the current song playing).
- `/loop` — Toggles whether the queue loops back to the start when it reaches the end.
- `/queue [page]` — Displays a page of the current queue, 5 songs at a time.
- `/remove <position>` — Removes a song from the queue at the given position (1 = the currently playing song).
- `/nowplaying` — Reposts the "Now Playing" embed for the current song.
- `/setvolume <amount>` — Sets the playback volume to an exact percentage (1-100).
- `/adjustvolume <amount>` — Adjusts the playback volume by a relative amount (positive or negative), clamped to 1-100.
- `/volume` — Displays the current volume.

## Usage

ComfyKino is meant to be run locally — there's no hosted instance, so you'll need your own bot and your own music.

1. **Create a Discord bot.** Go to the [Discord Developer Portal](https://discord.com/developers/applications), create a new application, add a Bot user, and copy its token. Under OAuth2 URL Generator, select the `bot` and `applications.commands` scopes with permissions to view channels, send messages, and connect/speak in voice, then use the generated URL to invite it to your server.
2. **Provide your own token and IDs.** Create a `config.json` in the project root (this file is gitignored, so it stays local):
   ```json
   {
     "token": "your-bot-token",
     "clientId": "your-application-client-id",
     "guildId": "your-test-server-id"
   }
   ```
3. **Provide your own music.** Add a `music/` folder in the project root (see structure below).
4. **Install dependencies and register commands:**
   ```
   npm install
   node deploy-commands.js
   ```
5. **Run the bot:**
   ```
   node main.js
   ```
6. Join a voice channel in your server and run `/play`.

### Music folder structure

The `music/` folder lives in the project root, with one subfolder per game or soundtrack. Each subfolder contains its songs as `.mp3` (or `.flac`) files, plus an `info.json` with the metadata shown in the "Now Playing" embed, and a `cover.jpg` used as the embed's artwork.

```
music/
  Chrono Trigger/
    cover.jpg
    info.json
    Corridors of Time.mp3
    Robo's Theme.mp3
    Schala's Theme.mp3
    ...
  Minecraft/
    cover.jpg
    info.json
    Wet Hands.mp3
    Subwoofer Lullaby.mp3
    ...
```

`info.json` holds the metadata shared by every song in that folder:

```json
{
  "origin": "Chrono Trigger",
  "year": "1995",
  "composer": "Yasunori Mitsuda, Nobuo Uematsu"
}
```

ComfyKino scans every subfolder of `music/` on `/play`/`/start`/`/reset` and queues up every `.mp3`/`.flac` file it finds, so adding a new soundtrack is just a matter of dropping in a new folder with the same `cover.jpg` + `info.json` + song files layout.

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, EndBehaviorType } = require('@discordjs/voice');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { pipeline } = require('stream');
const { OpusEncoder } = require('@discordjs/opus');
const prism = require('prism-media');

// Create the encoder.
// Specify 48kHz sampling rate and 2 channel size.
const encoder = new OpusEncoder(48000, 2);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const deepgram_connection = deepgram.listen.live({
  model: "nova-2",
  language: "fr",
  smart_format: true,
});

deepgram_connection.on(LiveTranscriptionEvents.Open, () => {
  console.log("Deepgram connection opened.");

  deepgram_connection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram connection closed.");
  });

  deepgram_connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    console.log('Transcript:', data.channel.alternatives[0].transcript);
  });

  deepgram_connection.on(LiveTranscriptionEvents.Metadata, (data) => {
    console.log('Metadata:', data);
  });

  deepgram_connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error(err);
  });
});

// Map to store active transcription sessions
const activeTranscriptions = new Map();

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Ignore bot's own voice state updates
    if (newState.member.user.bot) return;

    // User joined a voice channel
    if (newState.channelId && !oldState.channelId) {
        const connection = joinVoiceChannel({
            channelId: newState.channelId,
            guildId: newState.guild.id,
            adapterCreator: newState.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        const receiver = connection.receiver;
        receiver.speaking.on('start', async (userId) => {
            const user = client.users.cache.get(userId);
            if (!user) return;
            
            console.log(`User ${user.tag} started speaking`);

            // Create a readable stream for the user's audio
            const audioStream = receiver.subscribe(userId);

            audioStream.on('data', (chunk) => {
              const decoded = encoder.decode(chunk);
              deepgram_connection.send(decoded);
            });

        });

        receiver.speaking.on('end', (userId) => {
            const user = client.users.cache.get(userId);
            if (!user) return;
            
            console.log(`User ${user.tag} stopped speaking`);
            
            // Clean up resources
            receiver.subscriptions.get(userId)?.unsubscribe();
        });
    }
    // User switched voice channels
    else if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
        const connection = joinVoiceChannel({
            channelId: newState.channelId,
            guildId: newState.guild.id,
            adapterCreator: newState.guild.voiceAdapterCreator,
        });
    }
    // User left voice channel
    else if (!newState.channelId) {
        const connection = newState.guild.voiceStates.cache
            .get(client.user.id)?.channel;
        if (connection) {
            const voiceConnection = joinVoiceChannel({
                channelId: oldState.channelId,
                guildId: oldState.guild.id,
                adapterCreator: oldState.guild.voiceAdapterCreator,
            });
            voiceConnection.destroy();
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

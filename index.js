require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, EndBehaviorType } = require('@discordjs/voice');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { pipeline, Transform } = require('stream');
const { OpusEncoder } = require('@discordjs/opus');
const prism = require('prism-media');
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

let deepgram_connection;

// Fonction pour configurer la connexion Deepgram
function setupDeepgramConnection() {
  if (deepgram_connection) {
    console.log("Closing existing Deepgram connection...");
    deepgram_connection.finish();
  }

  console.log("Setting up new Deepgram connection...");
  deepgram_connection = deepgram.listen.live({
  model: "nova-2",
  language: "fr",
  smart_format: true,
  encoding: "linear16",
  sample_rate: 48000,
  channels: 2,
  interim_results: true,
  endpointing: true,
  utterance_end_ms: 1000
});

  deepgram_connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("🟢 Deepgram connection opened");
  });

  // Envoyer un KeepAlive toutes les 5 secondes pour maintenir la connexion
  const keepAliveInterval = setInterval(() => {
    if (deepgram_connection.getReadyState() === 1) {
      console.log("💓 Sending KeepAlive to Deepgram");
      deepgram_connection.send(JSON.stringify({ type: "KeepAlive" }));
    } else {
      console.log("💔 Deepgram connection is closed or closing");
    }
  }, 5000);

  deepgram_connection.on(LiveTranscriptionEvents.Close, (event) => {
    console.log("Deepgram connection closed.", {
      code: event.code,
      reason: event.reason
    });
    
    clearInterval(keepAliveInterval);

    if (event.code === 1011) {
      console.log("Timeout - Trying to reconnect in 1 second...");
      setTimeout(setupDeepgramConnection, 1000);
    }
  });

deepgram_connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  if (data.channel?.alternatives?.[0]?.transcript) {
    console.log('🎤', data.channel.alternatives[0].transcript);
  }
});

deepgram_connection.on(LiveTranscriptionEvents.Warning, (warning) => {
  console.warn('Deepgram warning:', warning);
});

deepgram_connection.on(LiveTranscriptionEvents.Error, (err) => {
  console.error('Deepgram error:', err);
});

// Gestionnaire pour l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\nFermeture des connexions...');
  
  // Fermer la connexion Deepgram
  if (deepgram_connection) {
    deepgram_connection.finish();
  }

  // Détruire toutes les connexions vocales actives
  client.voice.adapters.forEach((connection) => {
    connection.destroy();
  });

  // Déconnecter le client Discord
  await client.destroy();
  
  console.log('Arrêt du programme.');
  process.exit(0);
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

            // Create a readable stream for the user's audio with longer inactivity duration
            const audioStream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterInactivity,
                    duration: 1000
                }
            });

            audioStream.on('data', (chunk) => {
                console.log('Raw audio chunk received at:', new Date().toISOString());
            });

            let currentPipeline;
            
            audioStream.on('end', () => {
                console.log('Audio stream ended normally');
            });

            audioStream.on('close', () => {
                console.log('Audio stream closed');
            });

            const decoder = new prism.opus.Decoder({
                rate: 48000,
                channels: 2,
                frameSize: 960
            });

            const transformStream = new Transform({
                transform(chunk, encoding, callback) {
                    try {
                        if (deepgram_connection.getReadyState() === 1) {
                            console.log('Sending chunk to Deepgram, size:', chunk.length);
                            deepgram_connection.send(chunk);
                            callback(null, chunk);
                        } else {
                            console.log('Skipping chunk - Deepgram connection not ready');
                            callback(null, chunk);
                        }
                    } catch (error) {
                        console.error('Transform error:', error);
                        callback(error);
                    }
                }
            });

            currentPipeline = pipeline(
                audioStream,
                decoder,
                transformStream,
                (err) => {
                    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                        console.error('Pipeline error:', err);
                    }
                }
            );

            // Store cleanup function
            activeTranscriptions.set(userId, () => {
                if (currentPipeline) {
                    decoder.destroy();
                    transformStream.destroy();
                }
            });

        });

        receiver.speaking.on('end', (userId) => {
            const user = client.users.cache.get(userId);
            if (!user) return;
            
            console.log(`User ${user.tag} stopped speaking`);
            
            // Clean up resources
            const cleanup = activeTranscriptions.get(userId);
            if (cleanup) {
                cleanup();
                activeTranscriptions.delete(userId);
            }
            receiver.subscriptions.get(userId)?.destroy();
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

// Démarrer la connexion Deepgram
setupDeepgramConnection();

client.login(process.env.DISCORD_TOKEN);

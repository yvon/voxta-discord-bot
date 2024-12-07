require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

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

function setupDeepgramConnection() {
  if (deepgram_connection) {
    console.log("Closing existing Deepgram connection...");
    deepgram_connection.finish();
  }

  console.log("Setting up new Deepgram connection...");
  deepgram_connection = deepgram.listen.live({
    model: "nova-2",
    language: "en",
    encoding: "opus",
    sample_rate: 48000,
  });

  deepgram_connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram connection opened");
  });

  deepgram_connection.on(LiveTranscriptionEvents.Close, (event) => {
    console.log("Deepgram connection closed.");
  });

  deepgram_connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    if (data.channel?.alternatives?.[0]?.transcript) {
      console.log('Transcription:', data.channel.alternatives[0].transcript);
    }
  });

  return deepgram_connection;
}

process.on('SIGINT', async () => {
  console.log('\nClosing connections...');
  
  // Close Deepgram connection
  if (deepgram_connection) {
    deepgram_connection.finish();
  }

  // Destroy all active voice connections
  client.voice.adapters.forEach((connection) => {
    connection.destroy();
  });

  // Disconnect Discord client
  await client.destroy();
  
  console.log('Program stopped.');
  process.exit(0);
});

// Function to cleanup voice connection resources
function cleanupVoiceConnection(connection) {
    if (!connection) return;
    
    // Cleanup existing audio subscriptions
    connection.receiver?.subscriptions.forEach((subscription) => {
        subscription.destroy();
    });
    
    // Destroy the connection itself
    connection.destroy();
}

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Ignore bot's own voice state updates
    if (newState.member.user.bot) return;

    // Cleanup old connection if exists
    if (oldState.channelId) {
        const oldConnection = oldState.guild.voiceStates.cache.get(client.user.id)?.channel;
        if (oldConnection) {
            cleanupVoiceConnection(joinVoiceChannel({
                channelId: oldState.channelId,
                guildId: oldState.guild.id,
                adapterCreator: oldState.guild.voiceAdapterCreator,
            }));
        }
    }

    // User joined a voice channel or switched channels
    if (newState.channelId) {
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
              deepgram_connection.send(chunk);
            });
            
            audioStream.on('end', () => {
                console.log('Audio stream ended normally');
            });

            audioStream.on('close', () => {
                console.log('Audio stream closed');
            });

        });

        receiver.speaking.on('end', (userId) => {
            const user = client.users.cache.get(userId);
            if (!user) return;
            
            console.log(`User ${user.tag} stopped speaking`);
            receiver.subscriptions.get(userId)?.destroy();
        });
    }
});

client.login(process.env.DISCORD_TOKEN).then(() => {
    // Start Deepgram connection once connected to Discord
    setupDeepgramConnection();
}).catch(error => {
    console.error('Discord connection error:', error);
    process.exit(1);
});

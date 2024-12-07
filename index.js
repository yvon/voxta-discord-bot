require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const { LiveTranscriptionEvents } = require('@deepgram/sdk');
const DeepgramService = require('./deepgramService');
const logger = require('./logger');
const CONFIG = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const deepgramService = new DeepgramService(process.env.DEEPGRAM_API_KEY);

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

function setupDeepgramConnection() {
  // Use the deepgramService instance to setup connection
  deepgramService.setupConnection();
}

process.on('SIGINT', async () => {
  logger.info('\nClosing connections...');
  
  // Close Deepgram connection using the service
  deepgramService.closeConnection();

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
              deepgramService.connection?.send(chunk);
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

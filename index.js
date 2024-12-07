require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const { Transform } = require('stream');
const prism = require('prism-media');

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
    encoding: "opus",
    sample_rate: 48000,
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
  // console.log('Received transcript data:', JSON.stringify(data, null, 2));
  if (data.channel?.alternatives?.[0]?.transcript) {
    console.log('🎤 Transcription:', data.channel.alternatives[0].transcript);
  } else {
    console.log('⚠️ No transcript in data');
  }
});

deepgram_connection.on(LiveTranscriptionEvents.Warning, (warning) => {
  console.warn('Deepgram warning:', warning);
});

deepgram_connection.on(LiveTranscriptionEvents.Error, (err) => {
  console.error('Deepgram error:', err);
});

return deepgram_connection;
}  // Close setupDeepgramConnection function

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
        const oldConnection = oldState.guild.voiceStates.cache
            .get(client.user.id)?.channel;
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
    // Démarrer la connexion Deepgram une fois connecté à Discord
    setupDeepgramConnection();
}).catch(error => {
    console.error('Erreur de connexion Discord:', error);
    process.exit(1);
});

import { Client, GatewayIntentBits } from 'discord.js';
import eventBus from './utils/eventBus.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

let currentChannelId = null;
let connection = null;

function leaveChannel() {
    logger.info('Leaving voice channel');
    eventBus.emit('cleanup');

    if (connection) {
        connection.destroy();
        connection = null;
    }
}

function joinChannel(channel) {
    if (connection) {
        leaveChannel();
    }

    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
}

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    const channel = newState.channel;
    if (!channel) return;

    const channelConnection = getVoiceConnection(newState.channel.guild.id);

    if (!channelConnection) {
        joinChannel(channel);
    }
});

process.on('SIGINT', () => {
    logger.info('Closing connections...');
    leaveChannel();
    process.exit(0);
});

client.login(CONFIG.discord.token).catch(error => {
    logger.error('Discord connection error:', error);
    process.exit(1);
});

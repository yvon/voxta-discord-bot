import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

let channel = null;

function connection() {
    return getVoiceConnection(channel.guild.id);
}

function countMembersInChannel() {
    if (!channel) return 0;
    return channel.members.filter(member => !member.user.bot).size;
}

function leaveChannel() {
    if (!channel) return;

    logger.info('Leaving voice channel');

    connection().destroy();
    channel = null;
}

function joinChannel(newChannel) {
    leaveChannel();
    logger.info(`Joining voice channel ${newChannel.name}`);

    joinVoiceChannel({
        channelId: newChannel.id,
        guildId: newChannel.guild.id,
        adapterCreator: newChannel.guild.voiceAdapterCreator,
    });
    channel = newChannel;
}

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (channel && countMembersInChannel() < 1) {
        leaveChannel();
    }

    const newChannel = newState.channel;
    if (channel === newChannel) return;

    joinChannel(newChannel);
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

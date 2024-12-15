import { Client, GatewayIntentBits } from 'discord.js';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
let chatProcess = null;

function connection() {
    return getVoiceConnection(channel.guild.id);
}

function countMembersInChannel() {
    if (!channel) return 0;
    return channel.members.filter(member => !member.user.bot).size;
}

async function leaveChannel() {
    if (!channel) return;

    logger.info('Leaving voice channel');

    if (chatProcess) {
        chatProcess.kill();
        chatProcess = null;
    }

    connection().destroy();
    channel = null;
}

async function joinChannel(newChannel) {
    await leaveChannel();
    logger.info(`Joining voice channel ${newChannel.name}`);

    joinVoiceChannel({
        channelId: newChannel.id,
        guildId: newChannel.guild.id,
        adapterCreator: newChannel.guild.voiceAdapterCreator,
    });
    channel = newChannel;
    
    const __dirname = dirname(fileURLToPath(import.meta.url));
    chatProcess = fork(join(__dirname, 'chat.js'));
    chatProcess.send({ channelId: newChannel.id });
}

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (channel && countMembersInChannel() < 1) {
        await leaveChannel();
    }

    const newChannel = newState.channel;
    if (channel === newChannel) return;

    await joinChannel(newChannel);
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

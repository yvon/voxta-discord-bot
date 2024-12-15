import { Client, GatewayIntentBits } from 'discord.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';
import channelManager from './managers/channelManager.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member.user.bot) return;

    if (channelManager.currentChannel && channelManager.countMembersInChannel() < 1) {
        await channelManager.leaveChannel();
    }

    const newChannel = newState.channel;
    if (channelManager.currentChannel === newChannel) return;

    await channelManager.joinChannel(newChannel);
});

process.on('SIGINT', async () => {
    logger.info("\nClosing connections...");
    await channelManager.leaveChannel();
    await client.destroy();
    process.exit(0);
});

client.login(CONFIG.discord.token).catch(error => {
    logger.error('Discord connection error:', error);
    process.exit(1);
});

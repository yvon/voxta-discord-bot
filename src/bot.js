import { Client, GatewayIntentBits } from 'discord.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';
import channelManager from './managers/channelManager.js';
import eventBus from './utils/eventBus.js';

export class Bot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.on('ready', () => {
            logger.info(`Logged in as ${this.user.tag}!`);
        });

        this.on('voiceStateUpdate', async (oldState, newState) => {
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
            await eventBus.emit('shutdown');
            await this.destroy();
            process.exit(0);
        });
    }

    async start() {
        try {
            await this.login(CONFIG.discord.token);
        } catch (error) {
            logger.error('Discord connection error:', error);
            process.exit(1);
        }
    }
}

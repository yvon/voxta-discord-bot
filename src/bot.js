import { Client, GatewayIntentBits } from 'discord.js';
import logger from './utils/logger.js';
import channelManager from './managers/channel-manager.js';
import eventBus from './utils/event-bus.js';

export class Bot extends Client {
    constructor(token) {
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

    }

    async start() {
        try {
            await this.login(token);
        } catch (error) {
            logger.error('Discord connection error:', error);
            process.exit(1);
        }
    }
}

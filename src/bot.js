import { Client, GatewayIntentBits } from 'discord.js';
import logger from './utils/logger.js';
import channelManager from './managers/channel-manager.js';
import eventBus from './utils/event-bus.js';
import VoxtaApiClient from './clients/voxta-api-client.js';
import VoxtaConnectionConfig from './config/voxta-connection-config.js';
import CONFIG from './config/config.js';

export class Bot extends Client {
    constructor(token) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.token = token;
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
            this.startChat();
        });
    }

    async start() {
        try {
            await this.login(this.token);
        } catch (error) {
            logger.error('Discord connection error:', error);
            process.exit(1);
        }
    }

    async startChat() {
        const voxtaConnectionConfig = new VoxtaConnectionConfig(CONFIG.voxta.baseUrl);
        const voxtaApiClient = new VoxtaApiClient(voxtaConnectionConfig);
        const lastChatId = await voxtaApiClient.getLastChatId();

        logger.info(`Connecting to chat ${lastChatId}...`);
    }
}

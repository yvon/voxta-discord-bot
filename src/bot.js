import { Client, GatewayIntentBits } from 'discord.js';
import logger from './utils/logger.js';
import channelManager from './managers/channel-manager.js';
import eventBus from './utils/event-bus.js';
import VoxtaApiClient from './clients/voxta-api-client.js';
import VoxtaWebSocketClient from './clients/voxta-web-socket-client.js';
import VoxtaConnectionConfig from './config/voxta-connection-config.js';
import WSMessageService from './services/ws-message-service.js';
import CONFIG from './config/config.js';

export class Bot extends Client {
    constructor(token) {
        const voxtaConnectionConfig = new VoxtaConnectionConfig(CONFIG.voxta.baseUrl);

        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.token = token;
        this.voxtaApiClient = new VoxtaApiClient(voxtaConnectionConfig);
        this.voxtaWebSocketClient = new VoxtaWebSocketClient(voxtaConnectionConfig);
        this.wsMessageService = new WSMessageService(this.voxtaWebSocketClient);
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
                this.stopChat();
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
        const lastChatId = await this.voxtaApiClient.getLastChatId();
        logger.info(`Connecting to chat ${lastChatId}...`);

        await this.voxtaWebSocketClient.start();
        await this.wsMessageService.authenticate();
        await this.wsMessageService.resumeChat(lastChatId);
    }

    async stopChat() {
        this.voxtaWebSocketClient.stop();
    }
}

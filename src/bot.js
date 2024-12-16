import { Client, GatewayIntentBits } from 'discord.js';
import prism from 'prism-media';
import logger from './utils/logger.js';
import channelManager from './managers/channel-manager.js';
import eventBus from './utils/event-bus.js';
import VoxtaApiClient from './clients/voxta-api-client.js';
import AudioWebSocketClient from './clients/audio-websocket-client.js';
import HubClient from './clients/websockets/hub-client.js';
import VoxtaConnectionConfig from './config/voxta-connection-config.js';
import WSMessageService from './services/ws-message-service.js';
import VoiceService from './services/voice-service.js';
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
        this.hubClient = new HubClient(voxtaConnectionConfig);
        this.audioWebSocketClient = new AudioWebSocketClient(voxtaConnectionConfig);
        this.wsMessageService = new WSMessageService(this.hubClient);
        this.userId = null;
        this.sessionId = null;
        this.setupEventListeners();
        
        eventBus.on('voxtaMessage', (message) => {
            if (message.$type === 'chatStarting') {
                this.sessionId = message.sessionId;
            } else if (message.$type === 'chatStarted') {
                this.onChatStarted();
            }
        });
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
            this.userId = newState.member.id;
            logger.info(`User id: ${this.userId}`);
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

        await this.hubClient.start();
        await this.wsMessageService.authenticate();
        await this.wsMessageService.resumeChat(lastChatId);
    }

    async stopChat() {
        this.hubClient.stop();
    }

    createWavHeader(dataLength) {
        const buffer = Buffer.alloc(44);
        
        // RIFF identifier
        buffer.write('RIFF', 0);
        // File length
        buffer.writeUInt32LE(dataLength + 36, 4);
        // WAVE identifier
        buffer.write('WAVE', 8);
        // Format chunk marker
        buffer.write('fmt ', 12);
        // Format chunk length
        buffer.writeUInt32LE(16, 16);
        // Sample format (1 is PCM)
        buffer.writeUInt16LE(1, 20);
        // Channels
        buffer.writeUInt16LE(2, 22);
        // Sample rate
        buffer.writeUInt32LE(48000, 24);
        // Byte rate
        buffer.writeUInt32LE(48000 * 4, 28);
        // Block align
        buffer.writeUInt16LE(2, 32);
        // Bits per sample
        buffer.writeUInt16LE(16, 34);
        // Data chunk marker
        buffer.write('data', 36);
        // Data length
        buffer.writeUInt32LE(dataLength, 40);
        
        return buffer;
    }

    onChatStarted() {
        logger.info('Chat started');

        this.audioWebSocketClient.connect(this.sessionId);

        const connection = channelManager.getCurrentConnection();
        const voiceService = new VoiceService(connection, this.userId);

        voiceService.playMp3File('assets/connected.mp3');

        const decoder = new prism.opus.Decoder({
          rate: 48000,
          channels: 2,
          frameSize: 960
        });

        voiceService.audioStream.pipe(decoder).on('data', (chunk) => {
            const header = this.createWavHeader(chunk.length);
            const wavData = Buffer.concat([header, chunk]);
            this.audioWebSocketClient.send(wavData);
        });

        // Vérifier que le pipe est bien établi
        logger.info('Audio pipeline established');
    }
}

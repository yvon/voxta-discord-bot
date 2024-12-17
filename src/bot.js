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
import AudioPlayerService from './services/audio-player-service.js';
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
        this.audioPlayerService = new AudioPlayerService(this.voxtaApiClient);
        this.voiceService = new VoiceService();
        this.userId = null;
        this.sessionId = null;
        this.setupEventListeners();
        
        eventBus.on('voxtaMessage', (message) => {
            if (message.$type === 'chatStarting') {
                this.sessionId = message.sessionId;
            } else if (message.$type === 'chatStarted') {
                this.onChatStarted();
            } else if (message.$type === 'recordingStatus' && message.enabled === true) {
                this.onRecordingRequest();
            } else if (message.$type === 'speechRecognitionEnd') {
                this.onSpeechRecognitionEnd(message.text);
            }
        });

        eventBus.on('playAudio', async (audioData) => {
            this.onPlayAudio(audioData);
        });

        eventBus.on('speechPlaybackComplete', (messageId) => {
            this.onSpeechPlaybackComplete(messageId);
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

    onChatStarted() {
        logger.info('Chat started');

        const connection = channelManager.getCurrentConnection();
        this.voiceService.initialize(connection, this.userId);
        setTimeout(() => {
            this.voiceService.playMp3File('./assets/ready.mp3');
        }, 2000);
    }

    async onRecordingRequest() {
        logger.info('Recording request received');

        const decoder = new prism.opus.Decoder({
          rate: 16000,
          channels: 1,
          frameSize: 480
        });

        await this.audioWebSocketClient.connect(this.sessionId);

        this.voiceService.audioStream.pipe(decoder).on('data', (chunk) => {
            this.audioWebSocketClient.send(chunk);
        });
    }

    onSpeechRecognitionEnd(text) {
        this.wsMessageService.send(this.sessionId, text);
    }

    onPlayAudio(audioData) {
        this.voiceService.playAudioData(audioData);
    }

    onSpeechPlaybackComplete(messageId) {
        this.wsMessageService.speechPlaybackComplete(this.sessionId, messageId);
    }
}

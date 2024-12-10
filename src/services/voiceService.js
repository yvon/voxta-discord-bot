import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoiceService {
    constructor(client) {
        this.client = client;
        this.connection = null;
        eventBus.on('cleanup', () => this.cleanup());
        eventBus.on('voiceStateUpdate', (oldState, newState) => this.handleVoiceStateUpdate(oldState, newState));
    }

    cleanupVoiceConnection() {
        if (!this.connection) return;
        
        // Cleanup existing audio subscriptions
        this.connection.receiver?.subscriptions.forEach((subscription) => {
            subscription.destroy();
        });
        
        // Destroy the connection itself
        this.connection.destroy();
        this.connection = null;
    }

    handleVoiceStateUpdate(oldState, newState) {
        // Ignore bot's own voice state updates
        if (newState.member.user.bot) return;

        // User joined a voice channel or switched channels
        if (newState.channelId) {
            // Cleanup old connection if exists
            this.cleanupVoiceConnection();
            this.setupVoiceConnection(newState);
        }
    }

    setupVoiceConnection(state) {
        this.connection = joinVoiceChannel({
            channelId: state.channelId,
            guildId: state.guild.id,
            adapterCreator: state.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        logger.info(`Joined voice channel ${state.channel.name}`);
        eventBus.emit('voiceChannelJoined', state.channel);
        const receiver = this.connection.receiver;
        
        receiver.speaking.on('start', async (userId) => {
            const user = this.client.users.cache.get(userId);
            if (!user) return;
            
            logger.info(`User ${user.tag} started speaking`);
            
            const audioStream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterInactivity,
                    duration: 1000
                }
            });

            audioStream.on('data', (chunk) => {
                eventBus.emit('audioData', chunk);
            });
        });

        receiver.speaking.on('end', (userId) => {
            const user = this.client.users.cache.get(userId);
            if (!user) return;
            
            logger.info(`User ${user.tag} stopped speaking`);
            receiver.subscriptions.get(userId)?.destroy();
        });

    }

    cleanup() {
        this.cleanupVoiceConnection();
    }
}

export default VoiceService;

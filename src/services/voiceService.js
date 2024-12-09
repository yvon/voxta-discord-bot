import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoiceService {
    constructor(client, deepgramService) {
        this.client = client;
        this.deepgramService = deepgramService;
        eventBus.on('cleanup', () => this.cleanup());
    }

    cleanupVoiceConnection(connection) {
        if (!connection) return;
        
        // Cleanup existing audio subscriptions
        connection.receiver?.subscriptions.forEach((subscription) => {
            subscription.destroy();
        });
        
        // Destroy the connection itself
        connection.destroy();
    }

    handleVoiceStateUpdate(oldState, newState) {
        // Ignore bot's own voice state updates
        if (newState.member.user.bot) return;

        // Cleanup old connection if exists
        if (oldState.channelId) {
            const oldConnection = oldState.guild.voiceStates.cache.get(this.client.user.id)?.channel;
            if (oldConnection) {
                this.cleanupVoiceConnection(joinVoiceChannel({
                    channelId: oldState.channelId,
                    guildId: oldState.guild.id,
                    adapterCreator: oldState.guild.voiceAdapterCreator,
                }));
            }
        }

        // User joined a voice channel or switched channels
        if (newState.channelId) {
            this.setupVoiceConnection(newState);
        }
    }

    setupVoiceConnection(state) {
        const connection = joinVoiceChannel({
            channelId: state.channelId,
            guildId: state.guild.id,
            adapterCreator: state.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        const receiver = connection.receiver;
        
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
                this.deepgramService.sendAudio(chunk);
            });
        });

        receiver.speaking.on('end', (userId) => {
            const user = this.client.users.cache.get(userId);
            if (!user) return;
            
            logger.info(`User ${user.tag} stopped speaking`);
            receiver.subscriptions.get(userId)?.destroy();
        });

        return connection;
    }

    cleanup() {
        // Destroy all active voice connections
        this.client.voice.adapters.forEach((connection) => {
            connection.destroy();
        });
    }
}

export default VoiceService;

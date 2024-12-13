import { joinVoiceChannel, EndBehaviorType, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoiceService {
    static create(client, state) {
        return new VoiceService(client, state);
    }

    constructor(client, state) {
        this.client = client;
        this.connection = null;
        this.player = createAudioPlayer();
        eventBus.on('cleanup', () => this.cleanup());
        
        if (state) {
            this.setupVoiceConnection(state);
        }
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


    setupVoiceConnection(state) {
        if (this.connection) {
            logger.debug('Voice connection already exists, skipping setup');
            return;
        }

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
        if (this.player) {
            this.player.stop();
        }
    }

    async playStream(stream) {
        if (!this.connection) {
            logger.error('No voice connection available');
            return;
        }

        try {
            const resource = createAudioResource(stream);
            this.connection.subscribe(this.player);
            this.player.play(resource);

            return new Promise((resolve, reject) => {
                this.player.on('stateChange', (oldState, newState) => {
                    if (newState.status === 'idle') {
                        resolve();
                    }
                });
                
                this.player.on('error', (error) => {
                    logger.error('Error playing audio:', error);
                    reject(error);
                });
            });
        } catch (error) {
            logger.error('Error creating audio resource:', error);
            throw error;
        }
    }
}

export default VoiceService;

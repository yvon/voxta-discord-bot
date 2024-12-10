import { joinVoiceChannel, EndBehaviorType } from '@discordjs/voice';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class VoiceService {
    constructor(client) {
        this.client = client;
        eventBus.on('cleanup', () => this.cleanup());
        eventBus.on('voiceStateUpdate', (oldState, newState) => this.handleVoiceStateUpdate(oldState, newState));
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
        logger.debug('Voice state update:', {
            oldState: {
                channelId: oldState.channelId,
                guild: oldState.guild.id,
                member: oldState.member?.user.tag
            },
            newState: {
                channelId: newState.channelId,
                guild: newState.guild.id,
                member: newState.member?.user.tag
            }
        });
        
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

        logger.info(`Joined voice channel ${state.channel.name}`);
        eventBus.emit('voiceChannelJoined', state.channel);
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
                eventBus.emit('audioData', chunk);
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
        this.client.voice.adapters.forEach((connection) => {
            connection.destroy();
        });
    }
}

export default VoiceService;

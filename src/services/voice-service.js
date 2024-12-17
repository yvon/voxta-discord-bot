import { joinVoiceChannel, EndBehaviorType, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { Readable } from 'stream';
import logger from '../utils/logger.js';
import eventBus from '../utils/event-bus.js';

class VoiceService {
    async initialize(connection, userId) {
        this.connection = connection;
        await this.waitForConnection();
        this.player = createAudioPlayer();

        this.audioStream = connection.receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.Manual }
        });
    }

    async playAudioResource(resource) {
        if (!this.connection) {
            logger.error('Cannot play audio: No voice connection');
            return;
        }
        try {
            this.connection.subscribe(this.player);
            this.player.play(resource);
            await this.awaitPlaybackCompletion();
            logger.debug('Audio playback completed');
            eventBus.emit('audioPlaybackComplete');
        } catch (error) {
            logger.error('Error playing audio:', error);
            eventBus.emit('audioPlaybackError', error);
            throw error;
        }
    }

    async playAudioData(audioData) {
        const buffer = Buffer.from(audioData);
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const resource = createAudioResource(stream);
        await this.playAudioResource(resource);
    }

    async playMp3File(filePath) {
        logger.debug(`Playing audio file: ${filePath}`);
        const resource = createAudioResource(filePath);
        await this.playAudioResource(resource);
    }

    waitForConnection() {
        return new Promise((resolve) => {
            if (this.connection.state.status === 'ready') {
                resolve();
                return;
            }

            this.connection.once('stateChange', (_, newState) => {
                if (newState.status === 'ready') {
                    resolve();
                }
            });
        });
    }

    awaitPlaybackCompletion() {
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
    }
}

export default VoiceService;

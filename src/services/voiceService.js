import { joinVoiceChannel, EndBehaviorType, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { Readable } from 'stream';
import logger from '../utils/logger.js';
import eventBus from '../utils/event-bus.js';

class VoiceService {
    constructor(client, connection) {
        this.client = client;
        this.connection = connection;
        this.player = createAudioPlayer();
        
        const audioStream = connection.receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.Manual }
        });

        audioStream.on('data', (chunk) => {
            eventBus.emit('audioData', chunk);
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
            eventBus.emit('audioPlaybackComplete');
        } catch (error) {
            logger.error('Error playing audio:', error);
            eventBus.emit('audioPlaybackError', error);
            throw error;
        }
    }

    async handlePlayAudio(audioData) {
        // Convert ArrayBuffer to Buffer then to Readable stream
        const buffer = Buffer.from(audioData);
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const resource = createAudioResource(stream);
        await this.playAudioResource(resource);
    }

    async playMp3File(filePath) {
        const resource = createAudioResource(filePath);
        await this.playAudioResource(resource);
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

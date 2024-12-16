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

        eventBus.on('playAudio', this.handlePlayAudio.bind(this));
    }

    async handlePlayAudio(audioData) {
        if (!this.connection) {
            logger.error('Cannot play audio: No voice connection');
            return;
        }
        try {
            // Convert ArrayBuffer to Buffer then to Readable stream
            const buffer = Buffer.from(audioData);
            const stream = new Readable();
            stream.push(buffer);
            stream.push(null);

            const resource = createAudioResource(stream);
            this.connection.subscribe(this.player);
            this.player.play(resource);
            await this.awaitPlaybackCompletion();
            eventBus.emit('audioPlaybackComplete');
        } catch (error) {
            logger.error('Error playing audio stream:', error);
            eventBus.emit('audioPlaybackError', error);
        }
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

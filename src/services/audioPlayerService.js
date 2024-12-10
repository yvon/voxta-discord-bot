import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';
import player from 'play-sound';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        this.audioBuffer = [];
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    async playBuffer() {
        while (this.audioBuffer.length > 0) {
            const audioUrl = this.audioBuffer.shift();
            try {
                const response = await this.voxtaService.fetchResource(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                
                // Save the audio buffer to a temporary file
                const fs = await import('fs/promises');
                const os = await import('os');
                const path = await import('path');
                
                const tempFile = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
                await fs.writeFile(tempFile, Buffer.from(arrayBuffer));
                
                // Play the audio file
                await new Promise((resolve, reject) => {
                    player().play(tempFile, (err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });
                
                // Clean up the temporary file
                await fs.unlink(tempFile);
                
                logger.info('Finished playing audio file');
            } catch (error) {
                logger.error('Failed to play audio file:', error);
            }
        }
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        if (message.$type === 'replyChunk' && message.audioUrl) {
            logger.info('Audio URL:', message.audioUrl);
            this.audioBuffer.push(message.audioUrl);
            this.playBuffer();
        }
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;

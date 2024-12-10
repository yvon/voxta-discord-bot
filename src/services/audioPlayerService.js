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
        logger.info(`Starting playBuffer with ${this.audioBuffer.length} files in queue`);
        
        while (this.audioBuffer.length > 0) {
            const audioUrl = this.audioBuffer.shift();
            logger.info('Processing audio URL:', audioUrl);
            
            try {
                const response = await this.voxtaService.fetchResource(audioUrl);
                logger.debug('Fetched audio data, status:', response.status);
                const arrayBuffer = await response.arrayBuffer();
                await this.playAudioFile(arrayBuffer);
            } catch (error) {
                logger.error('Failed to process audio file:', error);
            }
        }
        
        logger.info('Finished processing audio buffer');
    }

    async playAudioFile(arrayBuffer) {
        const fs = await import('fs/promises');
        const os = await import('os');
        const path = await import('path');
        
        const tempFile = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
        logger.debug('Creating temporary file:', tempFile);
        
        try {
            await fs.writeFile(tempFile, Buffer.from(arrayBuffer));
            logger.debug('Wrote audio data to temporary file');
            
            // Play the audio file
            await new Promise((resolve, reject) => {
                logger.debug('Starting audio playback');
                player().play(tempFile, (err) => {
                    if (err) {
                        logger.error('Playback error:', err);
                        reject(err);
                    }
                    logger.debug('Playback completed successfully');
                    resolve();
                });
            });
            
            // Clean up the temporary file
            await fs.unlink(tempFile);
            logger.debug('Cleaned up temporary file');
            
        } catch (error) {
            logger.error('Error in playAudioFile:', error);
            // Try to clean up the temp file even if we had an error
            try {
                await fs.unlink(tempFile);
            } catch (cleanupError) {
                logger.error('Failed to clean up temporary file:', cleanupError);
            }
            throw error;
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

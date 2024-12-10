import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';
import { exec } from 'child_process';
import { promisify } from 'util';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        this.audioBuffer = [];
        this.isPlaying = false;
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

  // AI! 
    async playBuffer() {
        if (this.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        logger.info(`Starting playBuffer with ${this.audioBuffer.length} files in queue`);
        
        try {
            this.isPlaying = true;
            while (this.audioBuffer.length > 0) {
                const audioUrl = this.audioBuffer.shift();
                logger.info('Processing audio URL:', audioUrl);
                
                const response = await this.voxtaService.fetchResource(audioUrl);
                logger.debug('Fetched audio data, status:', response.status);
                const arrayBuffer = await response.arrayBuffer();
                await this.playAudioFile(arrayBuffer);
            }
        } catch (error) {
            logger.error('Failed to process audio buffer:', error);
        } finally {
            this.isPlaying = false;
            logger.info('Finished processing audio buffer');
        }
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
            
            // Play the audio file using macOS afplay
            const execPromise = promisify(exec);
            logger.debug('Starting audio playback');
            await execPromise(`afplay "${tempFile}"`);
            logger.debug('Playback completed successfully');
            
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
          // AI! au lieu de push l'url met une promise dans le tableau qui commence a telecharger
            this.audioBuffer.push(message.audioUrl);
            this.playBuffer();
        }
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;

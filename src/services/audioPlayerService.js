import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        // Audio buffers structure:
        // {
        //   messageId: {
        //     audioUrls: [],         // Array of audio URLs to fetch
        //     isComplete: false,     // Whether the message is complete
        //     sessionId: string,     // Session ID for the message
        //     isPlaying: false       // Whether currently playing
        //   }
        // }
        this.audioBuffers = {};
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
    }

    async checkAndSendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        // If buffer is marked as complete and there are no pending audio chunks
        if (buffer.isComplete && buffer.audioUrls.length === 0) {
            await this.sendPlaybackComplete(messageId);
            delete this.audioBuffers[messageId];
            logger.debug(`Cleaned up buffer for message ${messageId}`);
        }
    }

    async playBuffer(messageId) {
        const messageBuffer = this.audioBuffers[messageId];
        if (!messageBuffer) {
            logger.debug(`No buffer found for message ${messageId}`);
            return;
        }

        if (messageBuffer.isPlaying) {
            logger.debug('Already playing, skipping');
            return;
        }

        messageBuffer.isPlaying = true;
        const url = messageBuffer.audioUrls.shift();

        if (url) {
            let promise = this.voxtaService.getAudioResponse(url);

            while (promise) {
                const chunk = await promise;

                // Download next audio chunk while we play it
                const nextUrl = messageBuffer.audioUrls.shift();
                const nextPromise = nextUrl ? this.voxtaService.getAudioResponse(nextUrl) : null;

                try {
                    // Create temp file
                    const tempFile = path.join(os.tmpdir(), `voxta-${messageId}-${Date.now()}.mp3`);
                    await fs.promises.writeFile(tempFile, Buffer.from(chunk));
                    
                    const playbackPromise = new Promise((resolve, reject) => {
                        eventBus.once('audioPlaybackComplete', () => {
                            // Clean up temp file after playback
                            fs.promises.unlink(tempFile)
                                .catch(err => logger.error('Error deleting temp file:', err))
                                .finally(resolve);
                        });
                        eventBus.once('audioPlaybackError', (error) => {
                            // Clean up temp file on error
                            fs.promises.unlink(tempFile)
                                .catch(err => logger.error('Error deleting temp file:', err))
                                .finally(() => reject(error));
                        });
                    });

                    eventBus.emit('playAudio', tempFile);
                    await playbackPromise;
                } catch (error) {
                    logger.error('Error playing audio:', error);
                    messageBuffer.isPlaying = false;
                    return;
                }

                promise = nextPromise;
            }
        }

        await this.checkAndSendPlaybackComplete(messageId);
        messageBuffer.isPlaying = false;
    }

    handleReplyGenerating(message) {
        const messageId = message.messageId;
        const sessionId = message.sessionId;
        logger.info(`Initializing buffer for message ${messageId}`);
        this.audioBuffers[messageId] = {
            audioUrls: [],
            isComplete: false,
            sessionId: sessionId,
            isPlaying: false
        };
    }

    async sendPlaybackComplete(messageId) {
        const buffer = this.audioBuffers[messageId];
        if (!buffer) return;

        await this.voxtaService.sendWebSocketMessage("speechPlaybackComplete", {
            sessionId: buffer.sessionId,
            messageId: messageId
        });
        logger.info(`Sent playback complete for message ${messageId}`);
    }

    async handleReplyChunk(message) {
        if (!message.audioUrl) return;

        const messageId = message.messageId;
        logger.info(`Audio URL for message ${messageId}:`, message.audioUrl);
        
        try {
            this.audioBuffers[messageId].audioUrls.push(message.audioUrl);
            this.playBuffer(messageId);
        } catch (error) {
            logger.error('Error getting audio stream:', error);
        }
    }

    async handleReplyEnd(message) {
        const messageId = message.messageId;
        logger.info(`Marking message ${messageId} as complete`);
        if (this.audioBuffers[messageId]) {
            this.audioBuffers[messageId].isComplete = true;
            await this.checkAndSendPlaybackComplete(messageId);
        }
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        switch (message.$type) {
            case 'replyGenerating':
                this.handleReplyGenerating(message);
                break;
            case 'replyChunk':
                this.handleReplyChunk(message);
                break;
            case 'replyEnd':
                this.handleReplyEnd(message);
                break;
        }
    }
}

export default AudioPlayerService;

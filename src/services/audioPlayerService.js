import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

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
                
                // Create audio context
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Decode the audio data
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // Create audio source
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                
                // Play the audio
                source.start(0);
                
                // Wait for the audio to finish playing
                await new Promise(resolve => {
                    source.onended = resolve;
                });
                
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

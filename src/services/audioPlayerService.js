import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor() {
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

      // AI! on va traiter les messages replyChunk.
      // exemple:
      //   '$type': 'replyChunk',
      //   messageId: 'fa36b831-f419-4a1f-8ee5-7910ad0e382a',
      //   senderId: '3398fc5e-8a61-9dfa-56bb-519a50579e9f',
      //   startIndex: 0,
      //   endIndex: 31,
      //   text: 'Enough with the tests, sweetie.',
      //   audioUrl: '/api/tts/gens/62249de2-128c-bb53-fc3f-3e43146805f1',
      //   isNarration: false,
      //   sessionId: '9e026bda-2992-c60d-ea5c-12ddc1c065fc'
      // pour l'instant contente toi de logger l'url de l'audio
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;

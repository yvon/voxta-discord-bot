import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class AudioPlayerService {
    constructor(voxtaService) {
        this.voxtaService = voxtaService;
        eventBus.on('voxtaMessage', this.handleVoxtaMessage.bind(this));
        eventBus.on('cleanup', this.cleanup.bind(this));
    }

    handleVoxtaMessage(message) {
        logger.info('AudioPlayer received message:', message.$type);

        if (message.$type === 'replyChunk' && message.audioUrl) {
            logger.info('Audio URL:', message.audioUrl);
          // AI! ajoute l'url dans un buffer de fichiers a jouer puis lance la lecture du buffer en appellant une methode.
          // Pour l'instant la methode ne va rien faire d'autre que de boucler sur les fichiers du buffer et afficher leur
          // taille.
            this.voxtaService.fetchResource(message.audioUrl)
                .then(response => {
                    const contentLength = response.headers.get('content-length');
                    logger.info('Audio file size:', 
                        contentLength ? `${(contentLength / 1024).toFixed(2)} KB` : 'unknown');
                })
                .catch(error => logger.error('Failed to fetch audio file:', error));
        }
    }

    cleanup() {
        // Cleanup resources if needed
    }
}

export default AudioPlayerService;

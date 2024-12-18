import eventBus from '../utils/event-bus.js';

class WSMessageService {
    constructor(wsClient) {
        this.wsClient = wsClient;

        eventBus.on('speechPlaybackStart', (message) => {
            this.speechPlaybackStart(
                message.sessionId,
                message.messageId,
                message.startIndex,
                message.endIndex,
                message.duration
            );
        });
    }

    authenticate() {
        return this.wsClient.sendMessage('authenticate', {
            client: "SimpleClient",
            clientVersion: "1.0",
            scope: ["role:app"],
            capabilities: {
                audioInput: "WebSocketStream",
                audioOutput: "Url",
                acceptedAudioContentTypes: ["audio/x-wav", "audio/mpeg"]
            }
        });
    }

    resumeChat(chatId) {
        return this.wsClient.sendMessage('resumeChat', { chatId });
    }

    send(sessionId, text) {
        return this.wsClient.sendMessage('send', { sessionId, text, doReply: true, doCharacterActionInference: true });
    }

    speechPlaybackComplete(sessionId, messageId) {
        return this.wsClient.sendMessage('speechPlaybackComplete', { sessionId, messageId });
    }

    speechPlaybackStart(sessionId, messageId, startIndex, endIndex, duration) {
        return this.wsClient.sendMessage('speechPlaybackStart', { sessionId, messageId, startIndex, endIndex, duration });
    }
}

export default WSMessageService;

class WSMessageService {
    constructor(wsClient) {
        this.wsClient = wsClient;
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
}

export default WSMessageService;

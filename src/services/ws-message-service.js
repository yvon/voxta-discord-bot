class WSMessageService {
    constructor(sendMessage) {
        this.sendMessage = sendMessage;
    }

    authenticate() {
        return this.sendMessage('authenticate', {
            client: "SimpleClient",
            clientVersion: "1.0",
            scope: ["role:app"],
            capabilities: {
                audioInput: "None",
                audioOutput: "Url",
                acceptedAudioContentTypes: ["audio/x-wav", "audio/mpeg"]
            }
        });
    }
}

export default WSMessageService;

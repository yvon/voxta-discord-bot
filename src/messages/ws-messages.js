export const authenticate = ({
    client = "SimpleClient",
    clientVersion = "1.0",
    scope = ["role:app"],
    capabilities = {
        audioInput: "None",
        audioOutput: "Url",
        acceptedAudioContentTypes: ["audio/x-wav", "audio/mpeg"]
    }
} = {}) => ({
    "$type": "authenticate",
    client,
    clientVersion,
    scope,
    capabilities
});

const CONFIG = {
    deepgram: {
        model: "nova-2",
        language: "fr",
        encoding: "opus",
        sampleRate: 48000
    },
    audio: {
        inactivityDuration: 1000
    }
};

module.exports = CONFIG;

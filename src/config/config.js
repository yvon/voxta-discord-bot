const CONFIG = {
    deepgram: {
        model: "nova-2",
        language: "fr",
        encoding: "opus",
        sampleRate: 48000
    },
    audio: {
        inactivityDuration: 1000
    },
    voxta: {
        baseUrl: process.env.VOXTA_URL || "http://localhost:5384"
    }
};

export default CONFIG;

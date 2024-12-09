import 'dotenv/config';

const CONFIG = {
    deepgram: {
        model: "nova-2",
        language: "fr",
        encoding: "opus",
        sampleRate: 48000,
        apiKey: process.env.DEEPGRAM_API_KEY
    },
    audio: {
        inactivityDuration: 1000
    },
    voxta: {
        baseUrl: process.env.VOXTA_URL || "http://localhost:5384"
    },
    discord: {
        token: process.env.DISCORD_TOKEN
    }
};

export default CONFIG;

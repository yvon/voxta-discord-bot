import 'dotenv/config';

const CONFIG = {
    voxta: {
        baseUrl: process.env.VOXTA_URL || "http://localhost:5384"
    },
    discord: {
        token: process.env.DISCORD_TOKEN
    }
};

export default CONFIG;

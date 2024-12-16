import { Bot } from './bot.js';
import CONFIG from './config/config.js';
import logger from './utils/logger.js';
import eventBus from './utils/event-bus.js';

const bot = new Bot(CONFIG.discord.token);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info("\nClosing connections...");
    await eventBus.emit('shutdown');
    await bot.destroy();
    process.exit(0);
});

// Handle other termination signals
process.on('SIGTERM', async () => {
    logger.info("\nReceived SIGTERM signal...");
    await eventBus.emit('shutdown');
    await bot.destroy();
    process.exit(0);
});

bot.start();

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const indexPath = join(__dirname, 'index.js');

function startBot() {
    const bot = fork(indexPath);
    
    bot.on('exit', (code) => {
        if (code === 0) {
            logger.info('Bot exited successfully, restarting...');
            startBot();
        } else {
            logger.error(`Bot exited with code ${code}, not restarting.`);
            process.exit(code);
        }
    });

    // Faire suivre SIGINT au processus fils
    process.on('SIGINT', () => {
        bot.kill('SIGINT');
    });
}

startBot();

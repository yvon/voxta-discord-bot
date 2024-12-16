import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import logger from '../utils/logger.js';
import eventBus from '../utils/eventBus.js';

class ChannelManager {
    constructor() {
        this.currentChannel = null;
        eventBus.on('shutdown', async () => {
            await this.leaveChannel();
        });
    }

    getCurrentConnection() {
        if (!this.currentChannel) return null;
        return getVoiceConnection(this.currentChannel.guild.id);
    }

    countMembersInChannel() {
        if (!this.currentChannel) return 0;
        return this.currentChannel.members.filter(member => !member.user.bot).size;
    }

    async leaveChannel() {
        if (!this.currentChannel) return;

        logger.info('Leaving voice channel');

        const connection = this.getCurrentConnection();
        if (connection) {
            connection.destroy();
        }

        this.currentChannel = null;
        eventBus.emit('channelLeft');
    }

    async joinChannel(newChannel) {
        await this.leaveChannel();
        logger.info(`Joining voice channel ${newChannel.name}`);

        joinVoiceChannel({
            channelId: newChannel.id,
            guildId: newChannel.guild.id,
            adapterCreator: newChannel.guild.voiceAdapterCreator,
        });
        
        this.currentChannel = newChannel;
        eventBus.emit('channelJoined');
    }
}

const channelManager = new ChannelManager();
export default channelManager;

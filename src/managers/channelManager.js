import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

class ChannelManager extends EventEmitter {
    constructor() {
        super();
        this.currentChannel = null;
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
        this.emit('channelLeft');
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
        this.emit('channelJoined');
    }
}

export default new ChannelManager();

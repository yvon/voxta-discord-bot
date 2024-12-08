import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';
import * as signalR from '@microsoft/signalr';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        // Extract and decode credentials from URL if present
        const credentials = url.username && url.password 
            ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;
            
        // WebSocket connection properties
        this.connection = null;
        this.wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    }

    async connectWebSocket() {
        if (this.connection) {
            return;
        }

        const wsUrl = `${this.baseUrl}/hub`;
        
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(wsUrl, {
                headers: this.authHeader ? { 'Authorization': this.authHeader } : {}
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Add message handler
        this.connection.on("ReceiveMessage", (message) => {
            logger.info('Received message from Voxta:', message);
            // Handle received message here
        });

        try {
            await this.connection.start();
            logger.info('Connected to Voxta WebSocket');

            await this.connection.invoke('SendMessage', {
                "$type": "authenticate",
                "client": "SimpleClient",
                "clientVersion": "1.0",
                "scope": ["role:app"],
                "capabilities": {"audioInput": "None", "audioOutput": "None"}
            });

        } catch (error) {
            logger.error('Error connecting to Voxta WebSocket:', error);
            this.connection = null;
            throw error;
        }
    }


    async getChats() {
        const url = `${this.baseUrl}/api/chats`;
        
        try {
            const headers = this.authHeader 
                ? { 'Authorization': this.authHeader }
                : {};
            
            const response = await fetch(url, { headers });
            if (!response.ok) {
                logger.error('Voxta API error:', response.status);
                return [];
            }
            
            const data = await response.json();
            return data.chats || [];
            return [];
        } catch (error) {
            logger.error('Network error fetching chats from Voxta:', error);
            return [];
        }
    }

    async getFirstChatId() {
        await this.connectWebSocket();
        const chats = await this.getChats();
        const chatId = chats.length > 0 ? chats[0].id : null;
        
        if (chatId) {
            // Send resumeChat message after getting the chat ID
            await this.connection.invoke('SendMessage', {
                "$type": "resumeChat",
                "chatId": chatId
            });
            logger.info('Resumed chat with ID:', chatId);
        }
        
        return chatId;
    }

    async cleanup() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}

export default VoxtaService;

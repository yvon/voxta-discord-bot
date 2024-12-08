import logger from '../utils/logger.js';
import CONFIG from '../config/config.js';

class VoxtaService {
    constructor() {
        const url = new URL(CONFIG.voxta.baseUrl);
        this.baseUrl = `${url.protocol}//${url.host}`;
        // Extract user:password from URL if present
        // Decode the username and password from URL encoding since the API expects 
        // Basic auth with 'WWW-Authenticate: Basic realm="restricted"'
        const credentials = url.username && url.password 
            ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`
            : null;
        this.authHeader = credentials 
            ? `Basic ${Buffer.from(credentials).toString('base64')}`
            : null;

        // Log the first few characters of the auth header for debugging
        if (this.authHeader) {
            logger.debug('Auth header preview:', this.authHeader.substring(0, 20) + '...');
        }
            
        // Debug log auth details
        logger.debug('Voxta URL:', this.baseUrl);
        logger.debug('Auth credentials present:', !!credentials);
        logger.debug('Auth header present:', !!this.authHeader);
        if (credentials) {
            // Log username but mask password for security
            const [username] = credentials.split(':');
            logger.debug('Auth username:', username);
        }
    }

    async init() {
        const url = `${this.baseUrl}/api/ui/init?signin=true`;
        try {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Discord-Transcription-Bot',
                ...(this.authHeader ? { 'Authorization': this.authHeader } : {})
            };
            
            logger.debug('Init request headers:', headers);
            const response = await fetch(url, { 
                method: 'GET',
                headers 
            });
            
            // Log response headers for debugging
            logger.debug('Init response headers:', Object.fromEntries(response.headers.entries()));
            
            const text = await response.text();
            if (!response.ok) {
                logger.error('Voxta init error:', response.status, text);
                logger.error('WWW-Authenticate header:', response.headers.get('WWW-Authenticate'));
                return false;
            }
            
            logger.debug('Voxta init successful');
            return true;
        } catch (error) {
            logger.error('Network error during Voxta init:', error);
            return false;
        }
    }

    async getChats() {
        // Initialize the connection before getting chats
        await this.init();
        const url = `${this.baseUrl}/api/chats`;
        
        try {
            const headers = this.authHeader 
                ? { 'Authorization': this.authHeader }
                : {};
            
            const response = await fetch(url, { headers });
            const text = await response.text(); // Get raw response text first
            
            if (!response.ok) {
                logger.error('Voxta API error:', response.status, text);
                return [];
            }
            
            try {
                const data = JSON.parse(text);
                return data.chats || [];
            } catch (error) {
                logger.error('Invalid JSON response from Voxta:', text);
                logger.error('Parse error:', error);
            }
            return [];
        } catch (error) {
            logger.error('Network error fetching chats from Voxta:', error);
            return [];
        }
    }

    async getFirstChatId() {
        const chats = await this.getChats();
        return chats.length > 0 ? chats[0].id : null;
    }
}

export default VoxtaService;

class VoxtaConnectionConfig {
    constructor(endpoint) {
        this.url = new URL(endpoint);
    }

    getHeaders() {
        if (!this.url.username || !this.url.password) {
            return {};
        }

        const decodedUsername = decodeURIComponent(this.url.username);
        const decodedPassword = decodeURIComponent(this.url.password);
        const basicAuthString = `${decodedUsername}:${decodedPassword}`;
        const base64Credentials = Buffer.from(basicAuthString).toString('base64');

        return {
            'Authorization': `Basic ${base64Credentials}`
        };
    }

    getBaseUrl() {
        return `${this.url.protocol}//${this.url.host}`;
    }
}

export default VoxtaConnectionConfig;

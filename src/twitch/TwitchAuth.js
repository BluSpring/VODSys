const axios = require('axios').default;
const config = require('../../data/config.json');
const fs = require('fs');
const Logger = require('../util/Logger');

const logger = new Logger('TwitchAuth');

module.exports = class TwitchAuth {
    /**
     * @type {NodeJS.Timer}
     */
    static validationInterval = null;
    static lastValidation = 0;

    /**
     * @type {{
     *  accessToken: string,
     *  expiresOn: number
     * }}
     */
    static tokenData = fs.existsSync('./data/token.json') ? JSON.parse(fs.readFileSync('./data/token.json')) : null;
    static clientId = config.twitch.client_id;

    /**
     * 
     * @returns {Promise<string>}
     */
    async getToken() {
        if (!TwitchAuth.tokenData || !(await this.validateToken())) {
            return (await this.retrieveToken());
        }

        return TwitchAuth.tokenData.accessToken;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async validateToken(force = false) {
        if ((TwitchAuth.lastValidation + (60 * 60 * 1000) < Date.now()) || force) {
            const url = `https://id.twitch.tv/oauth2/validate`;

            try {
                const response = await axios.get(url, { 
                    headers: {
                        Authorization: `OAuth ${TwitchAuth.tokenData.accessToken}`
                    } 
                });

                TwitchAuth.lastValidation = Date.now();
                
                return response.status == 200;
            } catch (e) {
                logger.error('An error occurred while validating token:', e.stack);

                return false;
            }
        }

        if (TwitchAuth.tokenData && TwitchAuth.tokenData.expiresOn > Date.now()) {
            return true;
        }
    }

    async retrieveToken() {
        logger.info('Retrieving token...');

        const url = `https://id.twitch.tv/oauth2/token`;

        const body = new URLSearchParams();
        body.append('client_id', config.twitch.client_id);
        body.append('client_secret', config.twitch.client_secret);
        body.append('grant_type', 'client_credentials');

        const response = await axios.post(url, body);
        const data = response.data;

        TwitchAuth.tokenData = {
            accessToken: data.access_token,
            expiresOn: Date.now() + (data.expires_in * 1000)
        };

        fs.writeFileSync('./data/token.json', JSON.stringify(TwitchAuth.tokenData, null, 4));

        // Need to do this to make sure the token is valid
        if (!(await this.validateToken(true))) {
            logger.warn('Token is invalid, retrieving new token...');

            return await this.retrieveToken();
        }

        logger.info('Token retrieved.');

        if (TwitchAuth.validationInterval) {
            clearInterval(TwitchAuth.validationInterval);
        }

        TwitchAuth.validationInterval = setInterval(async () => {
            await this.validateToken();
        }, 60 * 60 * 1000);

        return TwitchAuth.tokenData.accessToken;
    }
}
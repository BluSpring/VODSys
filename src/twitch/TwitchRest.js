const axios = require('axios').default;
const Logger = require("../util/Logger");
const TwitchAuth = require('./TwitchAuth');

const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }

const logger = new Logger('TwitchRest');

module.exports = class TwitchRest {
    static #auth = new TwitchAuth();

    /**
     * @type {{
     *  remaining: number,
     *  limit: number,
     *  reset: number
     * }}
     */
    static rateLimit = null;

    static async handleRateLimit() {
        if (TwitchRest.rateLimit && TwitchRest.rateLimit.remaining <= 0 && TwitchRest.rateLimit.reset > Date.now()) {
            await sleep(TwitchRest.rateLimit.reset - Date.now());
        }

        return true;
    }

    static async get(url) {
        await TwitchRest.handleRateLimit();

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${await TwitchRest.#auth.getToken()}`,
                'Client-Id': TwitchAuth.clientId
            }
        });

        const data = response.data;

        TwitchRest.rateLimit = {
            remaining: response.headers['ratelimit-remaining'],
            limit: response.headers['ratelimit-limit'],
            reset: response.headers['ratelimit-reset']
        };
        
        return data;
    }

    static async post(url, body) {
        await TwitchRest.handleRateLimit();

        const response = await axios.post(url, body, {
            headers: {
                Authorization: `Bearer ${await TwitchRest.#auth.getToken()}`,
                'Client-Id': TwitchAuth.clientId
            }
        });

        const data = response.data;

        TwitchRest.rateLimit = {
            remaining: response.headers['ratelimit-remaining'],
            limit: response.headers['ratelimit-limit'],
            reset: response.headers['ratelimit-reset']
        };

        return data;
    }
}
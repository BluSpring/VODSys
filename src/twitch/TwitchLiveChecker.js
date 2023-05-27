const axios = require('axios').default;
const { EventEmitter } = require('events');
const fs = require('fs');
const Logger = require('../util/Logger');
const TwitchRest = require('./TwitchRest');

const logger = new Logger('TwitchLiveChecker');

module.exports = class TwitchLiveChecker extends EventEmitter {
    static live = TwitchLiveChecker.getCachedLiveStreams();

    /**
     * @type {TwitchLiveChecker[]}
     */
    static channels = [];

    /**
     * 
     * @returns {string[]}
     */
    static getCachedLiveStreams() {
        const file = './data/live.json';

        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file);
            return JSON.parse(data);
        }

        return [];
    }

    constructor(channel) {
        super();
        this.channel = channel;

        TwitchLiveChecker.channels.push(this);
    }

    static async check() {
        const data = await this.streamData();

        let livePeople = [];

        if (data) {
            const live = data.data.filter(d => d.type === 'live');

            if (live.length > 0) {

                for (const stream of live) {
                    const channel = TwitchLiveChecker.channels.find(c => c.channel.login === stream.user_login);

                    if (channel && !TwitchLiveChecker.live.includes(stream.user_login)) {
                        TwitchLiveChecker.live.push(stream.user_login);
                        livePeople.push(stream.user_login);
                    }
                }
            }
        }

        TwitchLiveChecker.live = TwitchLiveChecker.live.filter(a => livePeople.includes(a));
        fs.writeFileSync('./data/live.json', JSON.stringify(TwitchLiveChecker.live, null, 4));
    }

    static async streamData() {
        try {
            const url = `https://api.twitch.tv/helix/streams?user_login=${TwitchLiveChecker.channels.map(c => c.channel.login).join('&user_login=')}`;

            const stream = await TwitchRest.get(url);

            return stream;
        } catch (e) {
            logger.error('An error occurred while getting stream data:', e);
            return null;
        }
    }
}
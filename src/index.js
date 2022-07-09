const axios = require('axios').default;
const TwitchLiveChecker = require('./twitch/TwitchLiveChecker');

const config = require('../data/config.json');
const TwitchAuth = require('./twitch/TwitchAuth');
const Logger = require('./util/Logger');
const fs = require('fs');
const TwitchArchive = require('./twitch/TwitchArchive');
const YoutubeUploader = require('./youtube/YoutubeUploader');

const logger = new Logger('VODSys');

process.on('unhandledRejection', (err) => {
    logger.error('An uncaught error occurred:', err);
});

const uploader = new YoutubeUploader();

(async () => {
    const auth = new TwitchAuth();

    // Get token first before everyone else
    await auth.getToken();

    for (const channel of config.channels) {
        const archive = new TwitchArchive(channel);

        setInterval(async () => {
            try {
                archive.checkArchives();
            } catch (e) {
                logger.error('An error occurred while checking archives:', e.stack);
            }
        }, 1000 * 60 * 5);

        archive.on('archive', (archive) => {
            uploader.upload(archive);
        });

        try {
            archive.checkArchives();
        } catch (e) {
            logger.error('An error occurred while checking archives:', e.stack);
        }
    }
})();
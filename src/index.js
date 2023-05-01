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

async function getCancelledVideos() {
    logger.info(`Checking to see if any videos haven't been uploaded to YouTube yet...`);

    for (const uploading of TwitchArchive.videoData.uploading) {
        if (TwitchArchive.videoData.uploaded.filter(a => a.id == uploading.id).length == 0)
            continue;

        uploader.upload({
            title: uploading.title,
            description: uploading.description,
            twitchLogin: uploading.login,
            path: uploading.path,
            id: uploading.id
        });
    }
}

async function refreshGoogleTokens(channel) {
    // Make sure everyone's logged in
    const authClient = (await uploader.authorize(channel.login));

    try {
        if (!!authClient && !!(await authClient.getAccessToken())) {
            logger.info(`Using previous YouTube access token for ${channel.login}`);
        }
    } catch (e) {
        logger.info(`${channel.login}'s YouTube access token requires reauthentication!`);
        await uploader.getNewToken(channel.login, authClient);
    }
}

(async () => {
    logger.info(`Preparing to check for live streams...`);

    const auth = new TwitchAuth();

    // Get token first before everyone else
    await auth.getToken();

    logger.info(`Retrieved token from Twitch!`);

    getCancelledVideos();

    setInterval(() => {
        TwitchLiveChecker.check();
    }, 1000 * 60 * 5);

    for (const channel of config.channels) {
        const archive = new TwitchArchive(channel);
        new TwitchLiveChecker(channel);

        await refreshGoogleTokens(channel);

        setInterval(async () => {
            try {
                if (!TwitchLiveChecker.live.includes(channel.login))
                    archive.checkArchives();
            } catch (e) {
                logger.error('An error occurred while checking archives:', e.stack);
            }
        }, 1000 * 60 * 5);

        // Periodically refresh the Google auth tokens
        setInterval(async () => {
            await refreshGoogleTokens(channel);
        }, 6 * 60 * 60 * 1000);

        archive.on('archive', (archive) => {
            uploader.upload(archive);
        });

        logger.info(`Registered check for Twitch channel ${channel.login}!`);
    }

    TwitchLiveChecker.check();
})();
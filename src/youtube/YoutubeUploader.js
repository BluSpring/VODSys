const fs = require('fs');
const readline = require('readline');
const assert = require('assert')
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const Logger = require('../util/Logger');
const OAuth2 = google.auth.OAuth2;
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'];

const logger = new Logger('YoutubeUploader');

const config = require('../../data/config.json');
const TwitchArchive = require('../twitch/TwitchArchive');

module.exports = class YoutubeUploader {
    async upload(data) {
        const oauth2Client = await this.authorize(data.twitchLogin);
        logger.info(`Uploading to YouTube: ${data.title}`);

        const service = google.youtube('v3');

        try {
            const response = await service.videos.insert({
                auth: oauth2Client,
                part: 'snippet,status',
                requestBody: {
                    snippet: {
                        title: data.title,
                        description: data.description,
                        tags: config.youtube.tags ?? ['vod', 'twitch', 'stream', 'game'],
                        categoryId: config.youtube.category ?? 20, // Gaming, from Category IDs: https://gist.github.com/dgp/1b24bf2961521bd75d6c
                        defaultLanguage: 'en',
                        defaultAudioLanguage: 'en'
                    },
                    status: {
                        privacyStatus: 'public'
                    }
                },
                media: {
                    body: fs.createReadStream(data.path)
                }
            });

            fs.rmSync(path.join(data.path, '../../'), { recursive: true, force: true });

            TwitchArchive.videoData.uploaded.push({
                id: data.id,
                login: data.twitchLogin
            });

            TwitchArchive.videoData.uploading = TwitchArchive.videoData.uploading.filter(v => v.id !== data.id);

            TwitchArchive.saveVideoData();

            logger.info(`Successfully uploaded video "${data.title}" (${data.twitchLogin})! URL: https://youtube.com/watch?v=${response.data.id}`);
        } catch (e) {
            logger.error(`Failed to upload video "${data.title}"`, e.stack);
        }

    }

    async authorize(twitchLogin) {
        const credentials = JSON.parse(fs.readFileSync(`${config.paths.data}/client_secrets.json`));

        const oauth2Client = new OAuth2(
            credentials.web.client_id,
            credentials.web.client_secret,
            credentials.web.redirect_uris[0]
        );

        try {
            const oldToken = (await fs.promises.readFile(`${config.paths.data}/${twitchLogin}.client_oauth_token.json`)).toString();

            oauth2Client.setCredentials(JSON.parse(oldToken));
            const tokens = await oauth2Client.refreshAccessToken();
            fs.writeFileSync(`${config.paths.data}/${twitchLogin}.client_oauth_token.json`, JSON.stringify(tokens.credentials, null, 4));

            return oauth2Client;
        } catch (e) {
            console.error(e.stack);
            try {
                const tokens = await oauth2Client.refreshAccessToken();
                fs.writeFileSync(`${config.paths.data}/${twitchLogin}.client_oauth_token.json`, JSON.stringify(tokens.credentials, null, 4));
            } catch (e2) {
                await this.getNewToken(twitchLogin, oauth2Client);
            }

            return oauth2Client;
        }
    }

    /**
     * 
     * @param {string} twitchLogin 
     * @param {OAuth2Client} oauth2Client 
     */
    getNewToken(twitchLogin, oauth2Client) {
        return new Promise(async (resolve, reject) => {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });

            logger.info(`Log in for ${twitchLogin}`);

            logger.info(`Authorize this app by visiting this URL: ${authUrl}`);

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(`Enter the code from that page here: `, async code => {
                rl.close();

                try {
                    const token = await oauth2Client.getToken(code);

                    oauth2Client.setCredentials(token.tokens);
                    fs.writeFileSync(`${config.paths.data}/${twitchLogin}.client_oauth_token.json`, JSON.stringify(token.tokens, null, 4));

                    resolve(token);
                } catch (e) {
                    logger.error(`An error occurred while getting token:`, e.stack);
                    reject(e);
                }
            });
        });
    }
}

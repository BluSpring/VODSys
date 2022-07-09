const fs = require('fs');
const readline = require('readline');
const assert = require('assert')
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const Logger = require('../util/Logger');
const OAuth2 = google.auth.OAuth2;

// Category IDs: https://gist.github.com/dgp/1b24bf2961521bd75d6c
const category = 20; // Gaming

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const logger = new Logger('YoutubeUploader');

module.exports = class YoutubeUploader {
    async upload(data) {
        const token = await this.authorize(data.twitchLogin);

        const service = google.youtube('v3');

        try {
            const response = await service.videos.insert({
                auth: token,
                part: 'snippet,status',
                requestBody: {
                    snippet: {
                        title,
                        description,
                        tags: ['vod', 'twitch', 'stream', 'game'],
                        categoryId: category,
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

            logger.info(`Successfully uploaded video "${data.title}" (${data.twitchLogin})! URL: https://youtube.com/watch?v=${response.data.id}`);
        } catch (e) {
            logger.error(`Failed to upload video "${data.title}"`, e.stack);
        }

    }

    async authorize(twitchLogin) {
        if (!fs.existsSync(`./data/client_secrets.json`)) {
            throw Error(`Failed to find client_secrets.json!`);
        }

        const credentials = JSON.parse(fs.readFileSync(`./data/client_secrets.json`));

        const oauth2Client = new OAuth2(
            credentials.installed.client_id,
            credentials.installed.client_secret,
            credentials.installed.redirect_uris[0]
        );

        try {
            const oldToken = await fs.promises.readFile(`./data/${twitchLogin}.client_oauth_token.json`);

            return oldToken;
        } catch (e) {
            return await this.getNewToken(twitchLogin, oauth2Client);
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

            logger.info(`Authorize this app by visiting this URL: ${authUrl}`);

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(`Enter the code from that page here: `, async code => {
                rl.close();

                try {
                    const token = await oauth2Client.getToken(code);

                    oauth2Client.credentials = token;

                    fs.writeFileSync(`./data/${twitchLogin}.client_oauth_token.json`, JSON.stringify(token, null, 4));

                    resolve(token);
                } catch (e) {
                    logger.error(`An error occurred while getting token:`, e.stack);
                    reject(e);
                }
            });
        });
    }
}
const { EventEmitter } = require("events");
const TwitchRest = require("./TwitchRest");
const { VideoDownloader } = require('twitch-video-downloader');
const fs = require('fs');
const Logger = require("../util/Logger");
const path = require('path');

const uploaded = fs.existsSync('./data/uploaded.txt') ? fs.readFileSync('./data/uploaded.txt').toString().split('\n') : [];
const logger = new Logger('TwitchArchive');

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

module.exports = class TwitchArchive extends EventEmitter {
    static downloading = [];

    constructor(channel) {
        super();
        this.channel = channel;
        this.description = fs.existsSync(`./data/${this.channel.login}.description.txt`) ? fs.readFileSync(`./data/${this.channel.login}.description.txt`).toString() : `Uploaded using VODSys\nhttps://github.com/BluSpring/VODSys`;
    }

    async checkArchives() {
        const url = `https://api.twitch.tv/helix/videos?user_id=${this.channel.id}`;

        const data = await TwitchRest.get(url);

        if (data) {
            const videos = data.data.filter(d => d.type === "archive");

            if (videos.length > 0) {
                for (const video of videos) {
                    if (!uploaded.includes(video.id) && !TwitchArchive.downloading.includes(video.id)) {
                        this.downloadArchive(video);
                    }
                }
            }
        }
    }

    async downloadArchive(video) {
        logger.info(`[${video.id}] Downloading archive "${video.title}" for user ${this.channel.login}.`);

        TwitchArchive.downloading.push(video.id);

        const archiveFolder = `./data/archives/${this.channel.login}`;

        if (!fs.existsSync(archiveFolder))
            fs.mkdirSync(archiveFolder, { recursive: true });

        const downloader = new VideoDownloader(video.url, {
            downloadFolder: archiveFolder
        });

        const resolutions = await downloader.getVideoResolutionsAvailable();
        logger.info(`[${video.id}] Best resolution found: ${resolutions[0].quality}`);

        const download = await downloader.download(resolutions[0]);
        logger.info(`[${video.id}] Downloaded archive successfully, transcoding...`);

        const transcode = await downloader.transcode(download);
        logger.info(`[${video.id}] Transcoded archive successfully. Sending to uploader.`);

        const date = new Date(video.created_at);

        this.emit('archive', {
            path: transcode.filePath,
            title: `${video.title} - [ STREAM ARCHIVE ]`,
            description: this.description
                            .replace(/{broadcastDate}/g, `${toOrdinal(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()}`)
                            .replace(/{twitchCategory}/g, '(unavailable due to Twitch not providing data)'),
            twitchLogin: this.channel.login
        });

        uploaded.push(video.id);
        fs.writeFileSync('./data/uploaded.txt', uploaded.join('\n'));
    }
}

function toOrdinal(value) {
    let s = String(value),
        len = s.length,
        end  = s.substring(len - 1, 1),
        teen = len > 1 && s.substring(len - 2, 1) === "1",
        ord = "th";

    if (end === "1" && !teen)
        ord = "st";
    else if (end === "2" && !teen)
        ord = "nd";
    else if (end === "3" && !teen)
        ord = "rd";

    return `${value}${ord}`;
};
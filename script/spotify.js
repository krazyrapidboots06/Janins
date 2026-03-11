const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "spotify",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Play music with cover",
  commandCategory: "music",
  usages: "spotify <song name>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) {
    return api.sendMessage(
      "🎵 Please enter a song name.\nExample: spotify believer",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🔎 Searching song...", threadID, messageID);

    // search song
    const res = await axios.get(`https://api.popcat.xyz/ytsearch?q=${encodeURIComponent(query)}`);
    const video = res.data[0];

    if (!video) {
      return api.sendMessage("❌ Song not found.", threadID, messageID);
    }

    const title = video.title;
    const channel = video.channel;
    const duration = video.duration;
    const thumb = video.thumbnail;
    const videoId = video.id;

    // youtube mp3 api
    const audioApi = `https://api.vevioz.com/api/button/mp3/${videoId}`;

    // cache folder
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const audioPath = path.join(cacheDir, `spotify_${Date.now()}.mp3`);
    const coverPath = path.join(cacheDir, `cover_${Date.now()}.jpg`);

    // download cover
    const cover = await axios.get(thumb, { responseType: "arraybuffer" });
    fs.writeFileSync(coverPath, cover.data);

    // download audio
    const audio = await axios.get(audioApi, { responseType: "arraybuffer" });
    fs.writeFileSync(audioPath, audio.data);

    api.sendMessage(
      {
        body:
`🎵 Now Playing

Title: ${title}
Channel: ${channel}
Duration: ${duration}`,
        attachment: [
          fs.createReadStream(coverPath),
          fs.createReadStream(audioPath)
        ]
      },
      threadID,
      () => {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(coverPath);
      },
      messageID
    );

  } catch (err) {

    console.log(err);

    api.sendMessage(
      "❌ Failed to fetch the song.",
      threadID,
      messageID
    );
  }

};
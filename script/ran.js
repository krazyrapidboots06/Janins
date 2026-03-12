const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ran",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Send random video",
  commandCategory: "media",
  usages: "ran",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    api.sendMessage("🎬 Fetching a random video, please wait...", threadID, messageID);

    // Replace this URL with any safe random video API
    const apiUrl = `https://deku-api.giize.com/randgore`; 

    const res = await axios.get(apiUrl);
    if (!res.data || !res.data.result || !res.data.result.video) {
      return api.sendMessage("❌ Failed to fetch a random video.", threadID, messageID);
    }

    const videoUrl = res.data.result.video;
    const thumbUrl = res.data.result.thumb;
    const title = res.data.result.title || "Random Video";

    const videoPath = path.join(__dirname, "cache", `video_${Date.now()}.mp4`);
    const thumbPath = path.join(__dirname, "cache", `thumb_${Date.now()}.jpg`);

    // Download video
    const videoData = await axios.get(videoUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(videoPath, videoData.data);

    // Download thumbnail
    const thumbData = await axios.get(thumbUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(thumbPath, thumbData.data);

    api.sendMessage(
      {
        body: `🎥 ${title}`,
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      () => {
        fs.unlinkSync(videoPath);
        fs.unlinkSync(thumbPath);
      },
      messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error fetching the random video.", threadID, messageID);
  }
};
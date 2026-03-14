const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "onlytik",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "Get random TikTok videos",
  usages: "[search term or random]",
  cooldown: 3,
  hasPrefix: true,
};

module.exports.run = async ({ api, event, args }) => {
  const { messageID, threadID } = event;
  
  // Show that we’re working
  api.setMessageReaction("⏳", messageID, () => {}, true);

  const query = args.join(" ").trim();

  try {
    // Construct the API URL differently based on whether a query is provided
    const apiUrl = query
      ? `https://haji-mix-api.gleeze.com/api/onlytik?stream=true&search=${encodeURIComponent(query)}`
      : "https://haji-mix-api.gleeze.com/api/onlytik?stream=true&count=1"; // Random video

    // Call the API
    const response = await axios.get(apiUrl, { timeout: 30000 });

    // Log response structure
    console.log("API Response:", JSON.stringify(response.data, null, 2));

    // Extract video URL based on API response structure
    let videoUrl = null;
    
    if (response.data.data && Array.isArray(response.data.data.videos)) {
      const videos = response.data.data.videos;
      if (videos.length > 0) {
        videoUrl = videos[0].play || videos[0].wmplay;
      }
    } else if (response.data.data && response.data.data[0]) {
      videoUrl = response.data.data[0].play;
    }

    if (!videoUrl) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ No video found. Try a different search term.", threadID, messageID);
    }

    // Download the video
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const videoPath = path.join(cacheDir, `tiktok_${Date.now()}.mp4`);
    const videoRes = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 60000 });
    
    fs.writeFileSync(videoPath, videoRes.data);

    // Send the video back
    api.sendMessage(
      {
        body: query ? `🎵 TikTok search: "${query}"` : "🎵 Random TikTok video",
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      () => {
        try { fs.unlinkSync(videoPath); } catch (e) {}
      },
      messageID
    );

    api.setMessageReaction("✅", messageID, () => {}, true);

  } catch (err) {
    console.error("TikTok Error:", err);
    api.setMessageReaction("❌", messageID, () => {}, true);
    const errorMsg = err.response && err.response.status 
      ? `❌ Request failed (${err.response.status}).`
      : `❌ Error: ${err.message}`;
    return api.sendMessage(errorMsg, threadID, messageID);
  }
};

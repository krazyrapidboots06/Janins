const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "red",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Fetch a random video from the API",
  commandCategory: "media",
  usages: "red",
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    const waiting = await api.sendMessage("🎬 Fetching a random video... please wait.", threadID, messageID);

    // Fetch videos from API
    const response = await axios.get("https://betadash-api-swordslush-production.up.railway.app/sulasok?page=1", {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    // Check if data exists and has results
    if (!data || !data.results || data.results.length === 0) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ No videos found.", threadID, messageID);
    }

    // Get random video from results array
    const videos = data.results;
    const randomIndex = Math.floor(Math.random() * videos.length);
    const videoInfo = videos[randomIndex];

    // Extract video info
    const videoUrl = videoInfo.videoUrl || videoInfo.video || videoInfo.url;
    const title = videoInfo.title || "No title";
    const duration = videoInfo.duration || "Unknown";
    const views = videoInfo.views || "N/A";
    const uploader = videoInfo.uploader || videoInfo.author || "Unknown";

    if (!videoUrl) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ Video URL not found.", threadID, messageID);
    }

    // Update waiting message
    api.editMessage(`📥 Downloading: ${title.substring(0, 50)}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "red");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download video
    const videoPath = path.join(cacheDir, `red_${Date.now()}.mp4`);
    
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
          'Referer': 'https://betadash-api-swordslush-production.up.railway.app/'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      // Get file size
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      // Delete waiting message
      api.unsendMessage(waiting.messageID);

      // Send video with info
      api.sendMessage(
        {
          body: `🎬 **RANDOM VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${title}\n` +
                `**Duration:** ${duration}\n` +
                `**Views:** ${views}\n` +
                `**Uploader:** ${uploader}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        (err) => {
          if (err) console.error("Send error:", err);
          // Delete file after sending
          setTimeout(() => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          }, 60000);
        },
        messageID
      );

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.unsendMessage(waiting.messageID);
      api.sendMessage("❌ Failed to download video.", threadID, messageID);
    }

  } catch (err) {
    console.error("Red Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

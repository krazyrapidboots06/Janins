const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "red",
  version: "4.0.0",
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

    // New API endpoint
    const apiUrl = "https://betadash-api-swordslush-production.up.railway.app/lootedpinay?page=1";
    
    const res = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    // Get videos from response
    const videos = res.data.result || [];
    
    if (videos.length === 0) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ No videos found.", threadID, messageID);
    }

    // Get random video
    const randomVideo = videos[Math.floor(Math.random() * videos.length)];
    
    // Extract video information
    const videoUrl = randomVideo.videoUrl;
    const title = randomVideo.title || "Untitled";
    const thumbnail = randomVideo.image || "";

    if (!videoUrl) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ Video URL not found.", threadID, messageID);
    }

    api.editMessage(`📥 Downloading: ${title}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "red");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download video
    const videoPath = path.join(cacheDir, `red_${Date.now()}.mp4`);
    
    try {
      const videoResp = await axios.get(videoUrl, { 
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
          'Referer': 'https://pinayflix.top/'
        }
      });

      fs.writeFileSync(videoPath, videoResp.data);
      
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      api.unsendMessage(waiting.messageID);

      // Send video
      api.sendMessage(
        {
          body: `🎬 **RANDOM VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${title}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        () => {
          setTimeout(() => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          }, 60000);
        },
        messageID
      );

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.editMessage("❌ Download failed.", waiting.messageID);
    }

  } catch (err) {
    console.error("Red Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
